import { Controller, Post, Body, Headers, BadRequestException, Param } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { PaymentService } from '../application/payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('therapist/onboard')
  async onboardTherapist(@Body('therapistId') therapistId: string) {
    if (!therapistId) throw new BadRequestException('therapistId required');
    return this.paymentService.onboardTherapist(therapistId);
  }

  @Post('therapist/subscribe')
  async createSubscription(
    @Body('therapistId') therapistId: string,
    @Body('planType') planType: 'monthly' | 'yearly',
  ) {
    if (!therapistId || !planType) throw new BadRequestException('therapistId and planType required');
    return this.paymentService.createSubscription(therapistId, planType);
  }

  @Post('patient/appointment/order')
  async createOrder(
    @Body('patientId') patientId: string,
    @Body('therapistId') therapistId: string,
    @Body('time') time: string,
  ) {
    if (!patientId || !therapistId || !time) throw new BadRequestException('Missing required fields');
    return this.paymentService.createOrder(patientId, therapistId, time);
  }

  @Post('verify')
  async verifyPayment(
    @Body('razorpay_order_id') orderId: string,
    @Body('razorpay_payment_id') paymentId: string,
    @Body('razorpay_signature') signature: string,
  ) {
    return this.paymentService.verifySignature(orderId, paymentId, signature);
  }

  @Post('webhook')
  @AllowAnonymous()
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing signature');
    return this.paymentService.handleWebhook(body, signature);
  }

  @Post('appointment/:id/complete')
  async completeAppointment(@Param('id') appointmentId: string) {
    return this.paymentService.completeAppointment(appointmentId);
  }
}
