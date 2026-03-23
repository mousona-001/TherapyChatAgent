import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, therapistProfile, session } from '../src/database/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('🌱 Seeding test therapist and session...');

  const testUserId = 'test-therapist-user-id';
  const testTherapistId = 'test-therapist-id';
  const testSessionToken = 'test-session-token-123';

  // 1. Create User
  await db.insert(user).values({
    id: testUserId,
    name: 'Test Therapist',
    email: 'test-therapist@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: user.id,
    set: { updatedAt: new Date() }
  });

  // 2. Create Therapist Profile
  await db.insert(therapistProfile).values({
    id: testTherapistId,
    userId: testUserId,
    phoneNumber: '+919999999999',
    bio: 'Experienced therapist for testing.',
    isVerified: true,
    isAvailable: true,
    amountInPaise: 50000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: therapistProfile.id,
    set: { updatedAt: new Date() }
  });

  // 3. Create Session
  await db.insert(session).values({
    id: 'test-session-id',
    userId: testUserId,
    token: testSessionToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: session.id,
    set: { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), updatedAt: new Date() }
  });

  console.log('✅ Test therapist and session seeded!');
  console.log('User ID:', testUserId);
  console.log('Therapist ID:', testTherapistId);
  console.log('Session Token:', testSessionToken);

  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
