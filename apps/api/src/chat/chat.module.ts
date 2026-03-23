import { Module } from '@nestjs/common';
import { ChatController } from './presentation/chat.controller';
import { ChatService } from './application/chat.service';
import { THERAPIST_PORT } from './domain/therapist.port';
import { LangchainTherapistAdapter } from './infrastructure/langchain-therapist.adapter';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: THERAPIST_PORT,
      useClass: LangchainTherapistAdapter,
    },
  ],
})
export class ChatModule {}
