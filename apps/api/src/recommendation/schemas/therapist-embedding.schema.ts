import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'therapist_embeddings', timestamps: true })
export class TherapistEmbedding extends Document {
  @Prop({ required: true, unique: true, index: true, type: String })
  therapistId!: string;

  /** Full-text index used for BM25-style keyword matching */
  @Prop({ required: true, type: String })
  indexText!: string;

  updatedAt!: Date;
}

export const TherapistEmbeddingSchema = SchemaFactory.createForClass(TherapistEmbedding);

// Create a text index for faster full-text searches
TherapistEmbeddingSchema.index({ indexText: 'text' });
