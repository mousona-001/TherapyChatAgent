import { Controller, Post, Body, Res, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../application/chat.service';
import { ChatRequestDto } from '@repo/types';
import { Response, Request } from 'express';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message to the AI therapist' })
  @ApiResponse({ status: 200, description: 'AI response received successfully.' })
  async getChatResponse(@Body() body: ChatRequestDto, @Req() req: Request, @Res() res: Response) {
    try {
      // Extract patientId from the authenticated session (BetterAuth populates req.user)
      const patientId: string = (req as any).user?.id ?? '';
      const response = await this.chatService.processMessage(body.message, patientId);
      return res.status(HttpStatus.OK).json({ response });
    } catch (error) {
      console.error('AI Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to get AI response. Check your API key or connection.' 
      });
    }
  }
}
