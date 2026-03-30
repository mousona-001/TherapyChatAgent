import { Controller, Post, Get, Body, Param, Res, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../application/chat.service';
import { ChatRequestDto } from '@repo/types';
import { Response, Request } from 'express';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message to the AI therapist' })
  @ApiResponse({ status: 200, description: 'AI response received successfully.' })
  async getChatResponse(@Body() body: ChatRequestDto, @Req() req: Request, @Res() res: Response) {
    try {
      // Extract patientId from the authenticated session (BetterAuth populates req.user)
      const patientId: string = (req as any).user?.id ?? '';
      const response = await this.chatService.processMessage(body.message, patientId, body.sessionId);
      return res.status(HttpStatus.OK).json({ response });
    } catch (error) {
      console.error('AI Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to get AI response. Check your API key or connection.' 
      });
    }
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new brand-new chat session' })
  @ApiResponse({ status: 201, description: 'New session created successfully.' })
  async createSession(@Req() req: Request, @Res() res: Response, @Body() body: any) {
    try {
      const userId: string = (req as any).user?.id ?? '';
      const { connectionId, forceNew } = body;
      const sessionId = await this.chatService.createNewSession(userId, connectionId, forceNew);
      if (!sessionId) throw new Error('Session creation returned no ID');
      return res.status(HttpStatus.CREATED).json({ sessionId });
    } catch (error) {
      console.error('Create Session Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to create a new session.' 
      });
    }
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List all chat sessions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully.' })
  async getSessions(@Req() req: Request, @Res() res: Response) {
    try {
      const userId: string = (req as any).user?.id ?? '';
      const sessions = await this.chatService.getSessions(userId);
      return res.status(HttpStatus.OK).json(sessions);
    } catch (error) {
      console.error('Fetch Sessions Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to fetch sessions.' 
      });
    }
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Get all messages for a specific chat session' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully.' })
  async getMessages(@Param('id') sessionId: string, @Res() res: Response) {
    try {
      const messages = await this.chatService.getMessages(sessionId);
      return res.status(HttpStatus.OK).json(messages);
    } catch (error) {
      console.error('Fetch Messages Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to fetch messages for the session.' 
      });
    }
  }
}
