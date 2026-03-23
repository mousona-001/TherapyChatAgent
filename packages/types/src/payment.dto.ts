export interface CreateOrderDto {
  therapistId: string;
  time: string; // ISO String representation of the appointment time
}

export interface VerificationDto {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CreateSubscriptionDto {
  planType: 'monthly' | 'yearly';
}

export interface TherapistOnboardResponse {
  account_id: string;
  onboarding_link: string;
}

export interface SubscriptionResponse {
  subscription_id: string;
  status: string;
}

export interface OrderResponse {
  order_id: string;
  amount: number;
  currency: string;
}
