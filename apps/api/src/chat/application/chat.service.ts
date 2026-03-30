import { Injectable, Inject } from '@nestjs/common';
import { ITherapistPort, THERAPIST_PORT } from '../domain/therapist.port';
import { ChatHistoryRepository } from '../infrastructure/chat-history.repository';

@Injectable()
export class ChatService {
  constructor(
    @Inject(THERAPIST_PORT)
    private readonly therapist: ITherapistPort,
    private readonly historyRepo: ChatHistoryRepository,
  ) {}

  async processMessage(message: string, patientId: string, sessionId?: string): Promise<string> {
    return this.therapist.getResponse(message, patientId, sessionId);
  }

  /** Stream AI response tokens (used by ChatGateway for real-time WS streaming). */
  async streamResponse(message: string, patientId: string, sessionId: string) {
    return this.therapist.streamResponse(message, patientId, sessionId);
  }

  /** Persist a message directly to MongoDB without invoking the AI. */
  async addRawMessage(sessionId: string, role: 'user' | 'assistant', content: string, senderId?: string): Promise<void> {
    return this.historyRepo.addMessage(sessionId, role, content, senderId);
  }

  /** Async: update session memory fields (chatSummary, emotionalState, lastTopics). */
  async updateSessionMemory(sessionId: string, lastAiResponse: string): Promise<void> {
    return this.therapist.updateSessionMemory(sessionId, lastAiResponse);
  }

  async createNewSession(userId: string, connectionId?: string, forceNew = false): Promise<string> {
    return this.historyRepo.createNewSession(userId, connectionId, forceNew);
  }

  async getSessions(userId: string) {
    return this.historyRepo.getSessions(userId);
  }

  async getMessages(sessionId: string) {
    return this.historyRepo.getMessages(sessionId);
  }
}
