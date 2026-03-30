import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationController } from './presentation/recommendation.controller';
import { RecommendationService } from './application/recommendation.service';
import { TherapistEmbedding, TherapistEmbeddingSchema } from './schemas/therapist-embedding.schema';
import { ConnectionModule } from 'src/connection/connection.module';

@Module({
  imports: [
    ConnectionModule,
    MongooseModule.forFeature([
      { name: TherapistEmbedding.name, schema: TherapistEmbeddingSchema },
    ]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
