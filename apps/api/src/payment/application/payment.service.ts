import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IPaymentPort, PAYMENT_PORT } from '../domain/payment.port';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly webhookStrategies = new Map<string, (payload: Record<string, unknown>) => Promise<void>>();

  constructor(
    @Inject(PAYMENT_PORT) private readonly paymentPort: IPaymentPort,
    @InjectQueue('payment-transfers') private transferQueue: Queue,
  ) {
    this.registerDefaultStrategies();
  }

  registerWebhookStrategy(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
    this.webhookStrategies.set(event, handler);
  }

  private registerDefaultStrategies() {
    this.registerWebhookStrategy('payment.captured', async (payload) => {
      const payment = payload.payment as { entity: { order_id: string; id: string } };
      await this.paymentPort.onPaymentCaptured(payment.entity.order_id, payment.entity.id);
    });

    this.registerWebhookStrategy('payment.failed', async (payload) => {
      const payment = payload.payment as { entity: { order_id: string } };
      await this.paymentPort.onPaymentFailed(payment.entity.order_id);
    });

    this.registerWebhookStrategy('payment.dispute.created', async (payload) => {
      const dispute = payload.dispute as { entity: { order_id: string; id: string } };
      await this.paymentPort.onPaymentDisputeCreated(dispute.entity.order_id, dispute.entity.id);
    });

    this.registerWebhookStrategy('refund.processed', async (payload) => {
      const payment = payload.payment as { entity: { order_id: string; amount_refunded: number } };
      await this.paymentPort.onRefundProcessed(payment.entity.order_id, payment.entity.amount_refunded);
    });

    this.registerWebhookStrategy('refund.created', async (payload) => {
      const refund = payload.refund as { entity: { order_id: string; amount: number } };
      await this.paymentPort.onRefundCreated(refund.entity.order_id, refund.entity.amount);
    });

    this.registerWebhookStrategy('refund.failed', async (payload) => {
      const refund = payload.refund as { entity: { order_id: string; id: string } };
      await this.paymentPort.onRefundFailed(refund.entity.order_id, refund.entity.id);
    });

    const subActivatedHandler = async (payload: Record<string, unknown>) => {
      const sub = payload.subscription as { entity: { id: string; current_end: number } };
      await this.paymentPort.onSubscriptionActivated(sub.entity.id, sub.entity.current_end);
    };
    this.registerWebhookStrategy('subscription.activated', subActivatedHandler);
    this.registerWebhookStrategy('subscription.authenticated', subActivatedHandler);

    this.registerWebhookStrategy('subscription.pending', async (payload) => {
      const sub = payload.subscription as { entity: { id: string } };
      await this.paymentPort.onSubscriptionPending(sub.entity.id);
    });

    this.registerWebhookStrategy('invoice.paid', async (payload) => {
      const inv = payload.invoice as { entity: { subscription_id?: string } };
      if (inv.entity.subscription_id) {
        await this.paymentPort.onInvoicePaid(inv.entity.subscription_id);
      }
    });

    this.registerWebhookStrategy('invoice.expired', async (payload) => {
      const inv = payload.invoice as { entity: { subscription_id?: string } };
      if (inv.entity.subscription_id) {
        await this.paymentPort.onInvoiceExpired(inv.entity.subscription_id);
      }
    });

    this.registerWebhookStrategy('subscription.cancelled', async (payload) => {
      const sub = payload.subscription as { entity: { id: string } };
      await this.paymentPort.onSubscriptionCancelled(sub.entity.id);
    });

    this.registerWebhookStrategy('subscription.halted', async (payload) => {
      const sub = payload.subscription as { entity: { id: string } };
      await this.paymentPort.onSubscriptionHalted(sub.entity.id);
    });

    const accountHandler = async (payload: Record<string, unknown>) => {
      const acc = payload.account as { entity: { id: string; status: string } };
      await this.paymentPort.onAccountActivated(acc.entity.id, acc.entity.status);
    };
    this.registerWebhookStrategy('account.instantly_activated', accountHandler);
    this.registerWebhookStrategy('account.activated_kyc_pending', accountHandler);
  }

  async onboardTherapist(therapistId: string) {
    return this.paymentPort.onboardTherapist(therapistId);
  }

  async createSubscription(therapistId: string, planType: 'monthly' | 'yearly') {
    return this.paymentPort.createSubscription(therapistId, planType);
  }

  async createOrder(patientId: string, therapistId: string, timeIso: string) {
    return this.paymentPort.createOrder(patientId, therapistId, timeIso);
  }

  verifySignature(orderId: string, paymentId: string, signature: string) {
    return this.paymentPort.verifySignature(orderId, paymentId, signature);
  }

  async handleWebhook(body: Record<string, unknown>, signature: string) {
    try {
      if (!this.paymentPort.verifyWebhookSignature(JSON.stringify(body), signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }
    } catch (e: unknown) {
       throw new BadRequestException('Invalid webhook signature');
    }

    const { event, payload } = body as { event: string; payload: Record<string, unknown> };
    const eventId = String(body.id || ((payload.payment as Record<string, any>)?.entity?.id + '_' + event));

    if (await this.paymentPort.isWebhookProcessed(eventId)) {
      return { received: true, skipped: true };
    }

    try {
      await this.processEvent(event, payload);
      await this.paymentPort.markWebhookProcessed(eventId, body);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.paymentPort.logEvent('webhook_failure', `Failed to process webhook ${event}: ${errMessage}`, body);
    }
    return { received: true };
  }

  private async processEvent(event: string, payload: Record<string, unknown>) {
    const strategy = this.webhookStrategies.get(event);
    if (strategy) {
      await strategy(payload);
    } else {
      this.logger.log(`No webhook strategy registered for event: ${event}`);
    }
  }

  async completeAppointment(appointmentId: string) {
    await this.paymentPort.completeAppointment(appointmentId);
    
    await this.transferQueue.add('execute-transfer', { appointmentId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return { success: true };
  }

  async executeTransfer(appointmentId: string) {
    await this.paymentPort.executeTransfer(appointmentId);
  }
}
