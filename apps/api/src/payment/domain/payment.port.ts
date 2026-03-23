export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export interface IPaymentPort {
  onboardTherapist(therapistId: string): Promise<{ account_id: string; onboarding_link: string }>;
  createSubscription(therapistId: string, planType: 'monthly' | 'yearly'): Promise<{ subscription_id: string }>;
  createOrder(patientId: string, therapistId: string, timeIso: string): Promise<{ order_id: string; amount: number; currency: string }>;
  
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  isWebhookProcessed(eventId: string): Promise<boolean>;
  markWebhookProcessed(eventId: string, rawPayload: Record<string, unknown>): Promise<void>;
  
  onPaymentCaptured(orderId: string, paymentId: string): Promise<void>;
  onPaymentFailed(orderId: string): Promise<void>;
  onRefundProcessed(orderId: string, refundAmount: number): Promise<void>;
  onPaymentDisputeCreated(orderId: string, disputeId: string): Promise<void>;
  onRefundCreated(orderId: string, refundAmount: number): Promise<void>;
  onRefundFailed(orderId: string, refundId: string): Promise<void>;
  onAccountActivated(accountId: string, status: string): Promise<void>;
  onSubscriptionActivated(subscriptionId: string, currentEnd: number): Promise<void>;
  onSubscriptionPending(subscriptionId: string): Promise<void>;
  onInvoicePaid(subscriptionId: string): Promise<void>;
  onInvoiceExpired(subscriptionId: string): Promise<void>;
  onSubscriptionCancelled(subscriptionId: string): Promise<void>;
  onSubscriptionHalted(subscriptionId: string): Promise<void>;

  completeAppointment(appointmentId: string): Promise<void>;
  executeTransfer(appointmentId: string): Promise<void>;

  logEvent(type: string, message: string, payload: Record<string, unknown>, ids?: { appointmentId?: string, therapistId?: string, paymentId?: string }): Promise<void>;
}
