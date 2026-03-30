import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessageMongo>;

@Schema({ collection: 'chat_messages', timestamps: true })
export class ChatMessageMongo {
  @Prop({ required: true, index: true, type: String })
  sessionId!: string;           // FK to Postgres chat_session.id

  @Prop({ required: true, enum: ['user', 'assistant'], type: String })
  role!: 'user' | 'assistant';

  @Prop({ required: true, type: String })
  content!: string;

  @Prop({ required: false, type: String })
  senderId?: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessageMongo);

// Compound index for fast "get all messages for a session ordered by time"
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
