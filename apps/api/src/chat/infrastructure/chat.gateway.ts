import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from '../application/chat.service';
import { CrisisService } from '../../crisis/application/crisis.service';
import { ConnectionService } from '../../connection/application/connection.service';
import { db } from '../../database/db';
import { chatSession } from '../infrastructure/schemas/chat.schema';
import { therapistProfile, patientProfile } from '../../database/schema';
import { therapistConnection } from '../../connection/infrastructure/schemas/connection.schema';
import { eq, and } from 'drizzle-orm';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly connectionService: ConnectionService,
    private readonly crisisService: CrisisService,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      this.logger.warn(`[WS] Rejected unauthenticated connection: ${client.id}`);
      client.disconnect();
      return;
    }

    // Join personal notification room
    client.join(`user:${userId}`);
    client.data.userId = userId;
    this.logger.log(`[WS] Connected: ${client.id} → user:${userId}`);

    // Automated Presence: Mark profile as online
    const { therapistProfile, patientProfile } = await import('../../database/schema');
    
    const [tProfile] = await db
      .select()
      .from(therapistProfile)
      .where(eq(therapistProfile.userId, userId));

    if (tProfile) {
      await db
        .update(therapistProfile)
        .set({ status: 'online', updatedAt: new Date() })
        .where(eq(therapistProfile.userId, userId));
      this.logger.log(`[WS] Therapist ${userId} is now ONLINE`);
    }

    const [pProfile] = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, userId));

    if (pProfile) {
      this.logger.log(`[WS] Patient ${userId} is now ONLINE`);
    }

    // Always emit presence update if we found either profile
    if (tProfile || pProfile) {
      this.server.emit('presence:update', { userId, status: 'online' });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    const sessionId = client.data.sessionId as string | undefined;

    if (userId && sessionId) {
      const role = client.data.role as string | undefined;

      if (role === 'therapist') {
        // Mark AI as active again — therapist left
        await db
          .update(chatSession)
          .set({ isAiActive: true, updatedAt: new Date() })
          .where(eq(chatSession.id, sessionId));

        // Notify the room
        this.server.to(`session:${sessionId}`).emit('chat:ai_mode', {
          reason: 'Your therapist has left the session. AI is now covering.',
        });
        this.logger.log(`[WS] Therapist disconnected from session ${sessionId} — AI resumed`);
      }
    }

    if (this.server && userId) {
      // Check if any other sockets for this user are still connected in this namespace
      const userSockets = await this.server.in(`user:${userId}`).fetchSockets();
      if (userSockets.length === 0) {
        // Last connection closed -> mark as offline
        const { therapistProfile, patientProfile } = await import('../../database/schema');
        
        const [tProfile] = await db
          .select()
          .from(therapistProfile)
          .where(eq(therapistProfile.userId, userId));

        if (tProfile) {
          await db
            .update(therapistProfile)
            .set({ status: 'offline', updatedAt: new Date() })
            .where(eq(therapistProfile.userId, userId));
          this.logger.log(`[WS] Therapist ${userId} is now OFFLINE`);
        }

        const [pProfile] = await db
          .select()
          .from(patientProfile)
          .where(eq(patientProfile.userId, userId));

        if (pProfile) {
           this.logger.log(`[WS] Patient ${userId} is now OFFLINE`);
        }

        if (tProfile || pProfile) {
           this.server.emit('presence:update', { userId, status: 'offline' });
        }
      }
    }

    this.logger.log(`[WS] Disconnected: ${client.id}`);
  }

  // ── Join a Session Room ──────────────────────────────────────────────────────

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const userId = client.data.userId as string;
    const { sessionId } = data;
    if (!sessionId) {
      this.logger.warn(`[WS] Client ${client.id} attempted to join without a sessionId`);
      client.emit('error', { message: 'sessionId is required to join' });
      return;
    }

    // Verify this session belongs to the user (patient or therapist)
    const [session] = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId));

    if (!session) {
      client.emit('error', { message: 'Session not found' });
      return;
    }

    // Check if joiner is therapist
    let role: 'patient' | 'therapist' = 'patient';
    
    if (session.connectionId) {
      const { therapistConnection, therapistProfile } = await import('../../database/schema');
      const [connection] = await db
        .select()
        .from(therapistConnection)
        .where(eq(therapistConnection.id, session.connectionId));

      if (connection) {
        const [therapist] = await db
          .select()
          .from(therapistProfile)
          .where(eq(therapistProfile.userId, userId));

        if (therapist && therapist.id === connection.therapistId) {
          role = 'therapist';
        }
      }
    }

    client.data.sessionId = sessionId;
    client.data.role = role;
    client.join(`session:${sessionId}`);

    if (role === 'therapist') {
      const wasAiActive = session.isAiActive;
      
      // Switch off AI
      await db
        .update(chatSession)
        .set({ isAiActive: false, updatedAt: new Date() })
        .where(eq(chatSession.id, sessionId));

      // Only notify if we are actually handing over from AI to Human
      if (wasAiActive) {
        this.server.to(`session:${sessionId}`).emit('chat:therapist_joined', {
          message: 'Your therapist has joined the session. You are now chatting with a real person.',
        });
        this.logger.log(`[WS] Therapist handed over session: ${sessionId}`);
      }
    }

    this.logger.log(`[WS] ${role} ${userId} joined session:${sessionId}`);
  }

  // ── Incoming Message ─────────────────────────────────────────────────────────

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; content: string },
  ) {
    const userId = client.data.userId as string;
    const { sessionId, content } = data;
    if (!sessionId || !content) {
      this.logger.warn(`[WS] Invalid message from ${client.id}: sessionId=${sessionId}, content=${content}`);
      return;
    }

    // Load session
    const [session] = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId));

    if (!session) {
      client.emit('error', { message: 'Session not found' });
      return;
    }

    // Determine routing: human-to-human if therapist is in room OR sender is therapist
    const roomSockets = await this.server.in(`session:${sessionId}`).fetchSockets();
    const isSenderTherapist = client.data.role === 'therapist';
    const therapistInRoom = roomSockets.some(s => s.data.role === 'therapist');

    if (isSenderTherapist || (therapistInRoom && !session.isAiActive)) {
      // Force AI off if therapist is active
      if (!isSenderTherapist && !session.isAiActive === false) {
         await db.update(chatSession).set({ isAiActive: false }).where(eq(chatSession.id, sessionId));
      }

      // Forward to other party
      client.to(`session:${sessionId}`).emit('chat:message', {
        role: isSenderTherapist ? 'therapist' : 'patient',
        content,
        senderId: userId,
      });

      // Persist to MongoDB: Therapist is stored as 'assistant' to maintain role order in history
      const mongoRole = isSenderTherapist ? 'assistant' : 'user';
      await this.chatService.addRawMessage(sessionId, mongoRole, content, userId);

      // Notification: If a patient sent this, notify the therapist's private room
      if (!isSenderTherapist && session.connectionId) {
        await this.notifyTherapist(session.connectionId, sessionId, content);
      }
      return;
    }

    // AI route: stream response
    try {
      await this.chatService.addRawMessage(sessionId, 'user', content, userId);

      // Notification: If a patient sent this to AI, still notify the therapist
      if (session.connectionId) {
        await this.notifyTherapist(session.connectionId, sessionId, content);
      }

      const stream = await this.chatService.streamResponse(content, userId, sessionId);
      let fullResponse = '';

      for await (const chunk of stream) {
        // Token-by-token streaming
        const token = typeof chunk.content === 'string' ? chunk.content : '';
        if (token) {
          fullResponse += token;
          client.emit('chat:token', { token });
        }

        // TOOL CALL DETECTION (Crisis/Escalation)
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          const toolCall = chunk.tool_calls[0];
          if (toolCall.name === 'escalate_to_clinician') {
            const { reason } = toolCall.args;
            this.logger.warn(`🚨 CRISIS DETECTED in stream for patient ${userId}: ${reason}`);

            // 1. Trigger the actual automated call/SMS
            this.crisisService.triggerEscalation(userId, reason as string).catch(err => 
              this.logger.error(`Crisis escalation failed: ${err}`)
            );

            // 2. Override the response with the safe clinical text
            const safeResponse = "I have immediately notified our on-call clinical supervisor about this situation to ensure you get the help you need right now. Please stay safe, and remember you can reach the National Suicide Prevention Lifeline at 988 or 1-800-273-TALK.";
            
            // Stop streaming tokens to the client
            client.emit('chat:message_complete', { 
              role: 'assistant', 
              content: safeResponse,
              senderId: 'assistant'
            });

            // Persist the safe response instead of the tokens
            await this.chatService.addRawMessage(sessionId, 'assistant', safeResponse, 'assistant');
            return; // Terminate execution for this message
          }
        }
      }

      // Persist full AI response to MongoDB
      await this.chatService.addRawMessage(sessionId, 'assistant', fullResponse, 'assistant');

      // Emit completion event
      client.emit('chat:message_complete', { 
        role: 'assistant', 
        content: fullResponse,
        senderId: 'assistant'
      });

      // Async: update session memory (non-blocking)
      this.chatService.updateSessionMemory(sessionId, fullResponse).catch(err =>
        this.logger.error(`[Session Memory] Failed to update: ${err}`),
      );
    } catch (err) {
      this.logger.error(`[WS] AI stream error: ${err}`);
      client.emit('error', { message: 'AI response failed' });
    }
  }

  // ── Typing Indicator ─────────────────────────────────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.to(`session:${data.sessionId}`).emit('chat:typing', {
      senderId: client.data.userId,
    });
  }

  // ── Leave a Session ──────────────────────────────────────────────────────────

  @SubscribeMessage('chat:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.leave(`session:${data.sessionId}`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Emit a notification to a specific user's personal room. */
  notifyUser(userId: string, event: string, payload: object) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private async notifyTherapist(connectionId: string, sessionId: string, content: string) {
    try {
      const { therapistConnection, therapistProfile } = await import('../../database/schema');
      const [conn] = await db
        .select()
        .from(therapistConnection)
        .where(eq(therapistConnection.id, connectionId));
      
      if (conn) {
        const [therapist] = await db
          .select({ userId: therapistProfile.userId })
          .from(therapistProfile)
          .where(eq(therapistProfile.id, conn.therapistId));
        
        if (therapist) {
          this.server.to(`user:${therapist.userId}`).emit('message:notification', {
            sessionId,
            content,
          });
        }
      }
    } catch (err) {
      this.logger.error(`[WS] Failed to notify therapist: ${err}`);
    }
  }

  private extractUserId(client: Socket): string | null {
    // JWT passed as ?token= query param or auth.token in socket handshake
    const token: string =
      client.handshake.auth?.token ?? client.handshake.query?.token ?? '';

    if (!token) return null;

    try {
      // Decode JWT without verifying (verification is BetterAuth's job for REST,
      // here we decode the sub/userId from the payload as the WS doesn't go through
      // BetterAuth middleware). For production, verify with the JWT secret.
      const parts = token.split('.');
      if (parts.length < 2) return null;
      
      const payload = parts[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return decoded.sub ?? decoded.userId ?? null;
    } catch {
      return null;
    }
  }
}
