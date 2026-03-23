import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { eq, desc } from 'drizzle-orm';
import { db } from 'src/database/db';
import { DB_TOKEN } from 'src/database/database.module';
import { subscription, appointment, therapistProfile, processedWebhookEvent } from 'src/database/schema';
import { IPaymentPort } from '../domain/payment.port';

@Injectable()
export class DrizzlePaymentAdapter implements IPaymentPort {
  private readonly logger = new Logger(DrizzlePaymentAdapter.name);
  private razorpay: Razorpay;

  constructor(
    @Inject(DB_TOKEN) private dbClient: typeof db,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async logEvent(type: string, message: string, payload: Record<string, unknown>, ids?: { appointmentId?: string, therapistId?: string, paymentId?: string }) {
    this.logger.error(message, { 
      type, 
      ...ids, 
      payload 
    });
  }

  async onboardTherapist(therapistId: string) {
    const [profile] = await this.dbClient.select().from(therapistProfile).where(eq(therapistProfile.id, therapistId));
    if (!profile) throw new BadRequestException('Therapist not found');

    const accountId = `acc_${crypto.randomBytes(8).toString('hex')}`;
    
    await this.dbClient.update(therapistProfile)
      .set({ razorpayAccountId: accountId, razorpayAccountStatus: 'pending' })
      .where(eq(therapistProfile.id, therapistId));

    return { 
      account_id: accountId, 
      onboarding_link: `https://dashboard.razorpay.com/linked-account-onboarding?acc=${accountId}` 
    };
  }

  async createSubscription(therapistId: string, planType: 'monthly' | 'yearly') {
    const planId = planType === 'monthly' ? process.env.RAZORPAY_MONTHLY_PLAN_ID : process.env.RAZORPAY_YEARLY_PLAN_ID;
    if (!planId) throw new BadRequestException('Plan IDs not configured');

    const sub = await this.razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120,
    });

    await this.dbClient.insert(subscription).values({
      id: crypto.randomUUID(),
      therapistId,
      razorpaySubscriptionId: sub.id,
      status: 'created',
      planType,
    });

    return { subscription_id: sub.id };
  }

  async createOrder(patientId: string, therapistId: string, timeIso: string) {
    const [therapist] = await this.dbClient.select().from(therapistProfile).where(eq(therapistProfile.id, therapistId));
    
    if (!therapist || !therapist.amountInPaise) {
      throw new BadRequestException('Therapist pricing not configured');
    }

    const [sub] = await this.dbClient.select()
      .from(subscription)
      .where(eq(subscription.therapistId, therapistId))
      .orderBy(desc(subscription.createdAt)); // Get latest subscription

    if (!sub || sub.status !== 'active') {
      throw new BadRequestException('Therapist subscription is not active');
    }

    const amount = therapist.amountInPaise;
    const platformFee = Math.round(amount * 0.2);
    const therapistPayout = amount - platformFee;

    const order = await this.razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${crypto.randomBytes(4).toString('hex')}`,
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.dbClient.insert(appointment).values({
      id: crypto.randomUUID(),
      patientId,
      therapistId,
      time: new Date(timeIso),
      razorpayOrderId: order.id,
      status: 'pending_payment',
      slotStatus: 'reserved',
      expiresAt,
      amount,
      platformFee,
      therapistPayout,
    });

    return { order_id: order.id, amount, currency: 'INR' };
  }

  verifySignature(orderId: string, paymentId: string, signature: string) {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (generated_signature !== signature) {
      throw new BadRequestException('Invalid signature');
    }
    return true;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return validateWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);
  }

  async isWebhookProcessed(eventId: string): Promise<boolean> {
    const existing = await this.dbClient.select().from(processedWebhookEvent).where(eq(processedWebhookEvent.eventId, eventId));
    return existing.length > 0;
  }

  async markWebhookProcessed(eventId: string, rawPayload: Record<string, unknown>): Promise<void> {
    await this.dbClient.insert(processedWebhookEvent).values({ eventId, rawPayload });
  }

  async onPaymentCaptured(orderId: string, paymentId: string): Promise<void> {
    const [appt] = await this.dbClient.select().from(appointment).where(eq(appointment.razorpayOrderId, orderId));
    if (!appt) throw new Error(`Appointment not found for order ${orderId}`);

    if (orderId !== appt.razorpayOrderId) throw new Error('Payment mismatch');

    await this.dbClient.update(appointment)
      .set({ paymentId, status: 'paid', slotStatus: 'confirmed' })
      .where(eq(appointment.id, appt.id));
  }

  async onPaymentFailed(orderId: string): Promise<void> {
    await this.dbClient.update(appointment)
      .set({ status: 'cancelled', slotStatus: 'released' })
      .where(eq(appointment.razorpayOrderId, orderId));
  }

  async onRefundProcessed(orderId: string, refundAmount: number): Promise<void> {
    await this.dbClient.update(appointment)
      .set({ status: 'cancelled', slotStatus: 'released', refundStatus: 'processed', refundAmount })
      .where(eq(appointment.razorpayOrderId, orderId));
  }

  async onPaymentDisputeCreated(orderId: string, disputeId: string): Promise<void> {
    await this.dbClient.update(appointment)
      .set({ refundStatus: 'disputed' })
      .where(eq(appointment.razorpayOrderId, orderId));
      
    await this.logEvent('payment_dispute', `Dispute ${disputeId} created for order ${orderId}`, {}, { paymentId: disputeId });
  }

  async onRefundCreated(orderId: string, refundAmount: number): Promise<void> {
    await this.dbClient.update(appointment)
      .set({ status: 'cancelled', slotStatus: 'released', refundStatus: 'pending', refundAmount })
      .where(eq(appointment.razorpayOrderId, orderId));
  }

  async onRefundFailed(orderId: string, refundId: string): Promise<void> {
    await this.dbClient.update(appointment)
      .set({ refundStatus: 'failed' })
      .where(eq(appointment.razorpayOrderId, orderId));
      
    await this.logEvent('refund_failure', `Refund ${refundId} failed for order ${orderId}`, {}, { paymentId: refundId });
  }

  async onAccountActivated(accountId: string, status: string): Promise<void> {
    await this.dbClient.update(therapistProfile)
      .set({ razorpayAccountStatus: status as any })
      .where(eq(therapistProfile.razorpayAccountId, accountId));
  }

  async onSubscriptionActivated(subscriptionId: string, currentEnd: number): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ status: 'active', currentPeriodEnd: new Date(currentEnd * 1000) })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async onSubscriptionPending(subscriptionId: string): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ status: 'pending' })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async onInvoicePaid(subscriptionId: string): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ status: 'active' })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async onInvoiceExpired(subscriptionId: string): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ status: 'past_due' })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async onSubscriptionCancelled(subscriptionId: string): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async onSubscriptionHalted(subscriptionId: string): Promise<void> {
    await this.dbClient.update(subscription)
      .set({ status: 'halted' })
      .where(eq(subscription.razorpaySubscriptionId, subscriptionId));
  }

  async completeAppointment(appointmentId: string): Promise<void> {
    const [appt] = await this.dbClient.select().from(appointment).where(eq(appointment.id, appointmentId));
    if (!appt || appt.status !== 'paid') throw new BadRequestException('Invalid appointment for completion');

    await this.dbClient.update(appointment).set({ status: 'completed' }).where(eq(appointment.id, appointmentId));
  }

  async executeTransfer(appointmentId: string): Promise<void> {
    const [appt] = await this.dbClient.select().from(appointment).where(eq(appointment.id, appointmentId));
    const [therapist] = await this.dbClient.select().from(therapistProfile).where(eq(therapistProfile.id, appt.therapistId));

    if (!therapist.razorpayAccountId) throw new Error('Therapist has no linked account');
    
    try {
      await this.razorpay.transfers.create({
        account: therapist.razorpayAccountId,
        amount: appt.therapistPayout ?? 0,
        currency: 'INR',
        notes: { appointmentId: appt.id },
        // @ts-expect-error - missing in Razorpay types
        linked_account_notes: ['appointmentId']
      });

      await this.dbClient.update(appointment)
        .set({ transferStatus: 'processed', transferAttempts: (appt.transferAttempts || 0) + 1 })
        .where(eq(appointment.id, appointmentId));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      await this.dbClient.update(appointment)
        .set({ transferStatus: 'failed', transferAttempts: (appt.transferAttempts || 0) + 1 })
        .where(eq(appointment.id, appointmentId));
        
      await this.logEvent('transfer_failure', `Transfer failed: ${message}`, e as Record<string, unknown>, { appointmentId });
      throw e;
    }
  }
}
