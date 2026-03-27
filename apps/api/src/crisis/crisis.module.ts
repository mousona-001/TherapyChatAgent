import { Module } from '@nestjs/common';
import { CrisisService } from './application/crisis.service';
import { CrisisController } from './presentation/crisis.controller';
import { ElevenLabsAdapter } from './infrastructure/elevenlabs.adapter';
import { TwilioAdapter } from './infrastructure/twilio.adapter';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CrisisController],
  providers: [CrisisService, ElevenLabsAdapter, TwilioAdapter],
  exports: [CrisisService],
})
export class CrisisModule {}
