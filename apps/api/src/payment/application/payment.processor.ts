import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Processor('payment-transfers')
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} for transfer`);
    if (job.name === 'execute-transfer') {
      const appointmentId = job.data.appointmentId as string;
      await this.paymentService.executeTransfer(appointmentId);
    }
  }
}
