import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const API_URL = 'http://localhost:3001/payment/webhook';

async function simulateActivation(accountId: string) {
  const payload = {
    entity: 'event',
    account_id: 'acc_718c28f0aed9d64a', 
    event: 'account.instantly_activated',
    payload: {
      account: {
        entity: {
          id: accountId,
          status: 'activated'
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

  console.log('🚀 Sending mock activation webhook for:', accountId);
  
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

const accountId = process.argv[2];
if (!accountId) {
  console.log('Usage: npx ts-node scripts/test-webhook-activation.ts <RAZORPAY_ACCOUNT_ID>');
  process.exit(1);
}

simulateActivation(accountId);
