import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './presentation/chat.controller';
import { ChatService } from './application/chat.service';
import { THERAPIST_PORT } from './domain/therapist.port';
import { LangchainTherapistAdapter } from './infrastructure/langchain-therapist.adapter';
import { ChatHistoryRepository } from './infrastructure/chat-history.repository';
import { ChatGateway } from './infrastructure/chat.gateway';
import { ChatMessageMongo, ChatMessageSchema } from './infrastructure/schemas/chat-message.schema';
import { CrisisModule } from 'src/crisis/crisis.module';
import { ConnectionModule } from 'src/connection/connection.module';

@Module({
  imports: [
    CrisisModule,
    ConnectionModule,
    MongooseModule.forFeature([
      { name: ChatMessageMongo.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatHistoryRepository,
    ChatGateway,
    {
      provide: THERAPIST_PORT,
      useClass: LangchainTherapistAdapter,
    },
  ],
})
export class ChatModule {}
