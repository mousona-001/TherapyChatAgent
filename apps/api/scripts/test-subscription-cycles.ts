import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const API_URL = 'http://localhost:3001/payment/webhook';

async function sendWebhook(event: string, payload: any) {
    const body = JSON.stringify({
        entity: 'event',
        event,
        payload,
        created_at: Math.floor(Date.now() / 1000)
    });
    
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-razorpay-signature': signature
        },
        body
    });
    return response.json();
}

async function simulateScenarios(subscriptionId: string) {
    console.log(`🔍 Simulating Lifecycle for Subscription: ${subscriptionId}\n`);

    // Scenario 1: Renewal after ONE month
    console.log('📅 Scenario 1: Monthly Renewal (Success)');
    const nextPeriodEnd = Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 60) / 1000); // 60 days from now
    const renewalResult = await sendWebhook('subscription.activated', {
        subscription: {
            entity: {
                id: subscriptionId,
                status: 'active',
                current_end: nextPeriodEnd
            }
        }
    });
    console.log('✅ Renewal Webhook Sent:', renewalResult);

    // Scenario 2: Payment Failure (Halted)
    console.log('\n⚠️ Scenario 2: Payment Failure (Halted)');
    const failureResult = await sendWebhook('subscription.halted', {
        subscription: {
            entity: {
                id: subscriptionId,
                status: 'halted'
            }
        }
    });
    console.log('✅ Halted Webhook Sent:', failureResult);
}

const subscriptionId = process.argv[2];
if (!subscriptionId) {
    console.log('Usage: npx ts-node scripts/test-subscription-cycles.ts <SUBSCRIPTION_ID>');
    process.exit(1);
}

simulateScenarios(subscriptionId).catch(console.error);
