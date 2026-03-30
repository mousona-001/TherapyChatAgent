import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { user, therapistProfile } from '../src/database/schema';
import { randomUUID } from 'crypto';

// Load .env from the root of the api package
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL!;
const MONGODB_URI = process.env.MONGODB_URI!;

if (!DATABASE_URL || !MONGODB_URI) {
  console.error('❌ DATABASE_URL or MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Minimal Mongoose Schema for seeding (to avoid complex imports)
const TherapistEmbeddingSchema = new mongoose.Schema({
  therapistId: { type: String, required: true, unique: true },
  indexText: { type: String, required: true },
}, { collection: 'therapist_embeddings', timestamps: true });

const TherapistEmbedding = mongoose.models.TherapistEmbedding || mongoose.model('TherapistEmbedding', TherapistEmbeddingSchema);

async function seed() {
  console.log('🌱 Seeding therapists...');
  
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);
  
  await mongoose.connect(MONGODB_URI);

  const therapistsData = [
    {
      name: "Dr. Sarah Mitchell",
      specializations: "Anxiety, Panic Attacks, Phobias",
      methods: "CBT, Mindfulness-based Therapy",
      bio: "Empathetic psychologist with 12 years of experience helping patients navigate anxiety and panic disorders in a gentle, supportive environment.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 12,
      rating: "4.92"
    },
    {
      name: "Dr. James Wilson",
      specializations: "Trauma, PTSD, Complex Trauma",
      methods: "EMDR, Somatic Experiencing, DBT",
      bio: "Clinical psychologist specialized in trauma recovery and PTSD. I take a direct and analytical approach to help patients process difficult experiences.",
      commStyle: "direct",
      tone: "clinical",
      exp: 15,
      rating: "4.85"
    },
    {
      name: "Emily Chen",
      specializations: "Relationships, Couples Therapy, Family Conflict",
      methods: "Gottman Method, Emotionally Focused Therapy",
      bio: "Licensed marriage and family therapist dedicated to helping couples rebuild trust and improve communication through empathetic listening.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 8,
      rating: "4.78"
    },
    {
      name: "Michael Brown",
      specializations: "Workplace Stress, Career Coaching, Burnout",
      methods: "Solution-Focused Therapy, Motivational Interviewing",
      bio: "Helping high-performing professionals manage stress and prevent burnout. My approach is motivational and goal-oriented.",
      commStyle: "direct",
      tone: "motivational",
      exp: 10,
      rating: "4.65"
    },
    {
      name: "Dr. Aisha Khan",
      specializations: "Anxiety, Sleep Disorders, Insomnia",
      methods: "CBT-I, Relaxation Techniques",
      bio: "Specializing in the intersection of mental health and sleep. Helping patients overcome insomnia and anxiety-related sleep issues.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 20,
      rating: "4.95"
    },
    {
      name: "David Miller",
      specializations: "Depression, Motivation, Life Transitions",
      methods: "Psychodynamic Therapy, Existential Therapy",
      bio: "Supporting men and women through life's major transitions and helping them find meaning and motivation during depressive episodes.",
      commStyle: "direct",
      tone: "motivational",
      exp: 7,
      rating: "4.55"
    },
    {
      name: "Dr. Elena Rodriguez",
      specializations: "Trauma, Child & Adolescent Therapy",
      methods: "Play Therapy, Trauma-Focused CBT",
      bio: "Empowering children and teens to overcome trauma and developmental challenges through evidence-based, clinical approaches.",
      commStyle: "analytical",
      tone: "clinical",
      exp: 18,
      rating: "4.88"
    },
    {
      name: "Sarah Jenkins",
      specializations: "Anxiety, Social Phobia, Self-Esteem",
      methods: "Compassion-Focused Therapy, ACT",
      bio: "Helping individuals build self-compassion and overcome social anxiety to lead more fulfilling, connected lives.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 6,
      rating: "4.70"
    },
    {
      name: "Robert Taylor",
      specializations: "Grief, Loss, Loneliness",
      methods: "Narrative Therapy, Humanistic Approach",
      bio: "Providing a compassionate space for those navigating the difficult journey of grief and loss later in life.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 25,
      rating: "4.98"
    },
    {
      name: "Linda Wang",
      specializations: "Stress, Mindfulness, Women's Issues",
      methods: "MBSR, Integrative Therapy",
      bio: "Focusing on women's wellbeing through mindfulness-based stress reduction and holistic emotional support.",
      commStyle: "gentle",
      tone: "empathetic",
      exp: 12,
      rating: "4.82"
    }
  ];

  for (const t of therapistsData) {
    const userId = randomUUID();
    const profileId = randomUUID();
    const email = t.name.toLowerCase().replace(/[^a-z]/g, '') + '@example.com';

    console.log(`- Seeding ${t.name}...`);

    // 1. Create User
    await db.insert(user).values({
      id: userId,
      name: t.name,
      email: email,
      emailVerified: true,
      role: 'therapist',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // 2. Create Therapist Profile
    await db.insert(therapistProfile).values({
      id: profileId,
      userId: userId,
      firstName: t.name.split(' ')[0],
      lastName: t.name.split(' ').slice(1).join(' '),
      phoneNumber: "+91" + Math.floor(6000000000 + Math.random() * 4000000000), // Random Indian number
      bio: t.bio,
      specializations: t.specializations,
      therapyMethods: t.methods,
      yearsOfExperience: t.exp,
      isVerified: true,
      status: 'offline',
      communicationStyle: t.commStyle as any,
      tone: t.tone as any,
      rating: t.rating,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // 3. Create Recommendation Indexing doc
    const indexTextList = [
      t.bio,
      `Specializes in: ${t.specializations}`,
      `Methods: ${t.methods}`,
      `Style: ${t.commStyle}, ${t.tone}`,
      `Experience: ${t.exp} years`
    ];
    const indexText = indexTextList.filter(Boolean).join('. ');

    await TherapistEmbedding.findOneAndUpdate(
      { therapistId: profileId },
      { therapistId: profileId, indexText: indexText },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Successfully seeded 10 diverse therapist profiles!');
  await mongoose.disconnect();
  await client.end();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
