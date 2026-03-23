import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const API_URL = 'http://localhost:3001/payment/webhook';

async function simulateSubscriptionPayment(subscriptionId: string) {
  const payload = {
    entity: 'event',
    account_id: 'acc_718c28f0aed9d64a', 
    event: 'subscription.activated',
    payload: {
      subscription: {
        entity: {
          id: subscriptionId,
          status: 'active',
          current_end: Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000) // 30 days from now
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

  console.log('🚀 Sending mock subscription.activated webhook for:', subscriptionId);
  
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
    console.log('✅ Webhook Response (Activated):', data);

    // Also simulate invoice.paid
    const invPayload = {
        entity: 'event',
        event: 'invoice.paid',
        payload: {
          invoice: {
            entity: {
              subscription_id: subscriptionId,
              status: 'paid'
            }
          }
        },
        id: `inv_mock_${crypto.randomBytes(4).toString('hex')}`,
        created_at: Math.floor(Date.now() / 1000)
    };

    const invBody = JSON.stringify(invPayload);
    const invSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(invBody)
        .digest('hex');

    const invResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': invSignature
        },
        body: invBody
      });
      
      const invData = await invResponse.json();
      console.log('✅ Webhook Response (Invoice Paid):', invData);

  } catch (error: any) {
    console.error('❌ Webhook Failed:', error.message);
  }
}

const subscriptionId = process.argv[2];
if (!subscriptionId) {
  console.log('Usage: npx ts-node scripts/test-webhook-subscription.ts <SUBSCRIPTION_ID>');
  process.exit(1);
}

simulateSubscriptionPayment(subscriptionId);
