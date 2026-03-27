import { Controller, Post, Body, Query, Logger } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { CrisisService } from '../application/crisis.service';

@Controller('crisis')
export class CrisisController {
  private readonly logger = new Logger(CrisisController.name);

  constructor(private readonly crisisService: CrisisService) {}

  /**
   * Twilio posts call status updates here.
   * `patientId` is in the URL query string (embedded when we created the call).
   * Twilio's form-encoded body contains CallStatus, CallSid, etc.
   */
  @Post('twilio/status')
  @AllowAnonymous()
  async handleTwilioStatus(
    @Body() body: Record<string, string>,
    @Query('patientId') patientId: string,
  ): Promise<string> {
    const callStatus = body['CallStatus'];

    this.logger.log(`Twilio status callback received: status=${callStatus}, patient=${patientId}`);

    if (callStatus && patientId) {
      await this.crisisService.handleCallStatus(callStatus, patientId);
    }

    // Twilio expects a 200 response with valid TwiML or empty body
    return '<Response></Response>';
  }
}
