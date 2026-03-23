import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, therapistProfile } from '../src/database/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function sync() {
  console.log('🔄 Syncing Therapist Profile with BetterAuth user...');

  const email = 'test-therapist@example.com';
  const therapistId = 'test-therapist-id';

  // 1. Find the user created by BetterAuth
  const [dbUser] = await db.select().from(user).where(eq(user.email, email));
  
  if (!dbUser) {
    console.error('❌ No user found with email:', email);
    console.log('💡 Please run the curl SIGN-UP command first.');
    await client.end();
    return;
  }

  console.log('✅ Found BetterAuth user:', dbUser.id);

  // 2. Link therapistProfile to this user
  await db.insert(therapistProfile).values({
    id: therapistId,
    userId: dbUser.id,
    phoneNumber: '+919999999999',
    bio: 'Experienced therapist for testing.',
    isVerified: true,
    isAvailable: true,
    amountInPaise: 50000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: therapistProfile.id,
    set: { userId: dbUser.id, updatedAt: new Date() }
  });

  console.log('✅ Therapist profile linked to User ID:', dbUser.id);
  await client.end();
}

sync().catch(console.error);
