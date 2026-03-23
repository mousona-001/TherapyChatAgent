import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { therapistProfile, patientProfile } from '../../../database/schema';

export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  therapistId: text('therapist_id')
    .notNull()
    .references(() => therapistProfile.id, { onDelete: 'cascade' }),
  razorpaySubscriptionId: text('razorpay_subscription_id').unique(),
  status: text('status'),
  currentPeriodEnd: timestamp('current_period_end'),
  planType: text('plan_type'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const appointment = pgTable('appointment', {
  id: text('id').primaryKey(),
  therapistId: text('therapist_id')
    .notNull()
    .references(() => therapistProfile.id, { onDelete: 'cascade' }),
  patientId: text('patient_id')
    .notNull()
    .references(() => patientProfile.id, { onDelete: 'cascade' }),
  time: timestamp('time').notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  paymentId: text('payment_id'),
  status: text('status').default('pending_payment'),
  slotStatus: text('slot_status').default('reserved'),
  expiresAt: timestamp('expires_at'),
  amount: integer('amount'),
  platformFee: integer('platform_fee'),
  therapistPayout: integer('therapist_payout'),
  transferStatus: text('transfer_status').default('pending'),
  transferAttempts: integer('transfer_attempts').default(0),
  refundStatus: text('refund_status'),
  refundAmount: integer('refund_amount'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const processedWebhookEvent = pgTable('processed_webhook_event', {
  eventId: text('event_id').primaryKey(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
  rawPayload: jsonb('raw_payload'),
});
