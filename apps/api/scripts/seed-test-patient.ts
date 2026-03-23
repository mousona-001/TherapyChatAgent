import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { patientProfile, user } from '../src/database/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function seedPatient() {
  const patientId = 'test-patient-id';
  
  // 1. Create a User for the patient if it doesn't exist
  const email = 'test-patient@example.com';
  let [existingUser] = await db.select().from(user).where(eq(user.email, email));
  
  if (!existingUser) {
    [existingUser] = await db.insert(user).values({
      id: 'patient-user-id-123',
      name: 'Test Patient',
      email: email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    console.log('👤 Created User for Patient');
  }

  // 2. Create Patient Profile
  const [existingProfile] = await db.select().from(patientProfile).where(eq(patientProfile.id, patientId));
  
  if (!existingProfile) {
    await db.insert(patientProfile).values({
      id: patientId,
      userId: existingUser.id,
      phoneNumber: '+919876543210',
      gender: 'other',
      reasonForSeeking: 'General wellness and stress management',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Created Patient Profile:', patientId);
  } else {
    console.log('ℹ️ Patient Profile already exists');
  }

  process.exit(0);
}

seedPatient().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
