import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const API_URL = 'http://localhost:3001/payment/webhook';

async function simulatePaymentCaptured(orderId: string, amount: number) {
  const payload = {
    entity: 'event',
    account_id: 'acc_718c28f0aed9d64a', 
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_${crypto.randomBytes(4).toString('hex')}`,
          amount: amount,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          method: 'card',
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  console.log('🚀 Sending mock payment.captured webhook for order:', orderId);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body
    });
    
    const data = await response.json();
    console.log('✅ Webhook Response:', data);
  } catch (error: any) {
    console.error('❌ Webhook Failed:', error.message);
  }
}

const orderId = process.argv[2];
const amount = parseInt(process.argv[3] || '50000');
if (!orderId) {
  console.log('Usage: npx ts-node scripts/test-webhook-payment.ts <ORDER_ID> [AMOUNT_IN_PAISE]');
  process.exit(1);
}

simulatePaymentCaptured(orderId, amount);
