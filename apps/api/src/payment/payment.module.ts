import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { PaymentController } from './presentation/payment.controller';
import { PaymentService } from './application/payment.service';
import { PaymentProcessor } from './application/payment.processor';
import { DrizzlePaymentAdapter } from './infrastructure/drizzle-payment.adapter';
import { PAYMENT_PORT } from './domain/payment.port';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payment-transfers',
    }),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService, 
    PaymentProcessor,
    {
      provide: PAYMENT_PORT,
      useClass: DrizzlePaymentAdapter,
    }
  ],
  exports: [PaymentService, PAYMENT_PORT],
})
export class PaymentModule {}
