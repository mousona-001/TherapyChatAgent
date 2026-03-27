import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { CrisisService } from '../application/crisis.service';

@Controller('crisis')
export class CrisisController {
  private readonly logger = new Logger(CrisisController.name);

  constructor(private readonly crisisService: CrisisService) {}

  /**
   * Twilio posts call status updates here.
   * Query param `patientId` is embedded in the statusCallback URL.
   */
  @Post('twilio/status')
  @AllowAnonymous()
  async handleTwilioStatus(@Body() body: Record<string, string>): Promise<string> {
    const callStatus = body['CallStatus'];
    const patientId = body['patientId']; // passed via URL query param we embed in statusCallback

    this.logger.log(`Twilio status callback received: status=${callStatus}, patient=${patientId}`);

    if (callStatus && patientId) {
      await this.crisisService.handleCallStatus(callStatus, patientId);
    }

    // Twilio expects a 200 response with valid TwiML or empty body
    return '<Response></Response>';
  }
}
