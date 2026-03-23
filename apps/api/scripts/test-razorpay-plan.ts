import Razorpay from 'razorpay';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

async function testPlan() {
  const planId = process.env.RAZORPAY_MONTHLY_PLAN_ID;
  console.log('🧐 Testing Plan ID:', planId);
  
  if (!planId) {
    console.error('❌ RAZORPAY_MONTHLY_PLAN_ID is missing in .env');
    return;
  }

  try {
    const plan = await razorpay.plans.fetch(planId);
    console.log('✅ Plan found:', JSON.stringify(plan, null, 2));
  } catch (error: any) {
    console.error('❌ Failed to fetch plan:', error.error || error.message);
  }
}

testPlan().catch(console.error);
