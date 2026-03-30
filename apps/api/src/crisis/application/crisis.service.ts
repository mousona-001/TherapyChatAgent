import { Injectable, Logger, Inject } from '@nestjs/common';
import { TwilioAdapter } from '../infrastructure/twilio.adapter';
import { DB_TOKEN } from '../../database/database.module';
import { db } from '../../database/db';
import { patientProfile } from '../../database/schema';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';

@Injectable()
export class CrisisService {
  private readonly logger = new Logger(CrisisService.name);
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    private readonly twilio: TwilioAdapter,
    @Inject(DB_TOKEN) private readonly dbClient: typeof db,
  ) {}

  async triggerEscalation(patientId: string, reason: string): Promise<void> {
    this.logger.warn(`🚨 ESCALATION TRIGGERED for patient ${patientId}: ${reason}`);

    // 1. Look up patient contact details
    const [patient] = await this.dbClient
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, patientId));

    if (!patient) {
      this.logger.error(`Cannot escalate: Patient ${patientId} not found.`);
      return;
    }

    if (!patient.phoneNumber) {
      this.logger.error(`Patient ${patientId} has no phone number on file.`);
      return;
    }

    // 2. Initiate Twilio call — Twilio will connect to apps/stream WebSocket
    let callSid: string;
    try {
      callSid = await this.twilio.makeCall(patient.phoneNumber, patientId);
    } catch (e) {
      this.logger.error(`Twilio call failed: ${e}. Sending SMS directly to emergency contact.`);
      await this.sendEmergencyContactSms(patient);
      return;
    }

    // 3. Publish call metadata to Redis so apps/stream can resolve the patient
    await this.redis.publish(
      'crisis:initiate',
      JSON.stringify({ callSid, patientId }),
    );

    this.logger.log(`Published crisis:initiate → callSid: ${callSid}, patientId: ${patientId}`);
  }

  async handleCallStatus(callStatus: string, patientId: string): Promise<void> {
    this.logger.log(`Twilio status callback: ${callStatus} for patient ${patientId}`);

    const unansweredStatuses = ['no-answer', 'busy', 'failed'];
    if (unansweredStatuses.includes(callStatus)) {
      const [patient] = await this.dbClient
        .select()
        .from(patientProfile)
        .where(eq(patientProfile.userId, patientId));

      if (patient?.emergencyContactPhone) {
        await this.sendEmergencyContactSms(patient);
      } else {
        this.logger.warn(`No emergency contact for patient ${patientId}.`);
      }
    }
  }

  private async sendEmergencyContactSms(patient: typeof patientProfile.$inferSelect): Promise<void> {
    const contactName = patient.emergencyContactName ?? 'someone you trust';
    const message =
      `URGENT: ${contactName}, this is an automated alert from a mental health platform. ` +
      `The person who listed you as their emergency contact may be in crisis. ` +
      `Please try to reach them immediately. If needed, call emergency services (911).`;

    await this.twilio.sendSms(patient.emergencyContactPhone!, message);
    this.logger.warn(`📱 Emergency SMS sent to: ${patient.emergencyContactPhone}`);
  }
}
