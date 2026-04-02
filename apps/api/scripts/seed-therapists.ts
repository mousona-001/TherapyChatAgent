import { randomBytes, scryptSync } from "crypto";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import mongoose from "mongoose";
import * as path from "path";
import postgres from "postgres";
import {
	account,
	therapistProfile,
	therapistReview,
	user,
} from "../src/database/schema";

// Replicate better-auth's hashPassword exactly: <salt_hex>:<key_hex>
// Uses scrypt with N=16384, r=16, p=1, dkLen=64 — same as better-auth v1.x
function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const key = scryptSync(password.normalize("NFKC"), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2, // 64MB — matches better-auth's allocation
	});
	return `${salt}:${key.toString("hex")}`;
}

// Load .env from the root of the api package
dotenv.config({ path: path.join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL!;
const MONGODB_URI = process.env.MONGODB_URI!;

if (!DATABASE_URL || !MONGODB_URI) {
	console.error("❌ DATABASE_URL or MONGODB_URI is not defined in .env");
	process.exit(1);
}

// Minimal Mongoose Schema for seeding (to avoid complex imports)
const TherapistEmbeddingSchema = new mongoose.Schema(
	{
		therapistId: { type: String, required: true, unique: true },
		indexText: { type: String, required: true },
	},
	{ collection: "therapist_embeddings", timestamps: true },
);

const TherapistEmbedding =
	mongoose.models.TherapistEmbedding ||
	mongoose.model("TherapistEmbedding", TherapistEmbeddingSchema);

async function seed() {
	console.log("🌱 Seeding therapists...");

	const client = postgres(DATABASE_URL);
	const db = drizzle(client);

	await mongoose.connect(MONGODB_URI);

	const therapistsData = [
		{
			name: "Dr. Sarah Mitchell",
			gender: "female",
			dateOfBirth: "1985-03-14",
			licenseNumber: "PSY-2008-001",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations: "Anxiety, Panic Attacks, Phobias",
			methods: "CBT, Mindfulness-based Therapy",
			languages: "English, Hindi",
			bio: "Empathetic psychologist with 12 years of experience helping patients navigate anxiety and panic disorders in a gentle, supportive environment.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 12,
			rating: "4.92",
			reviewCount: 145,
			amountInPaise: 150000,
		},
		{
			name: "Dr. James Wilson",
			gender: "male",
			dateOfBirth: "1979-07-22",
			licenseNumber: "PSY-2005-002",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "Trauma, PTSD, Complex Trauma",
			methods: "EMDR, Somatic Experiencing, DBT",
			languages: "English",
			bio: "Clinical psychologist specialized in trauma recovery and PTSD. I take a direct and analytical approach to help patients process difficult experiences.",
			commStyle: "direct",
			tone: "clinical",
			exp: 15,
			rating: "4.85",
			reviewCount: 178,
			amountInPaise: 200000,
		},
		{
			name: "Emily Chen",
			gender: "female",
			dateOfBirth: "1990-11-05",
			licenseNumber: "MFT-2012-003",
			licenseType: "Licensed Marriage and Family Therapist",
			therapistType: "counselor",
			specializations: "Relationships, Couples Therapy, Family Conflict",
			methods: "Gottman Method, Emotionally Focused Therapy",
			languages: "English, Mandarin",
			bio: "Licensed marriage and family therapist dedicated to helping couples rebuild trust and improve communication through empathetic listening.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 8,
			rating: "4.78",
			reviewCount: 87,
			amountInPaise: 120000,
		},
		{
			name: "Michael Brown",
			gender: "male",
			dateOfBirth: "1983-02-17",
			licenseNumber: "LPC-2010-004",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "Workplace Stress, Career Coaching, Burnout",
			methods: "Solution-Focused Therapy, Motivational Interviewing",
			languages: "English",
			bio: "Helping high-performing professionals manage stress and prevent burnout. My approach is motivational and goal-oriented.",
			commStyle: "direct",
			tone: "motivational",
			exp: 10,
			rating: "4.65",
			reviewCount: 112,
			amountInPaise: 130000,
		},
		{
			name: "Dr. Aisha Khan",
			gender: "female",
			dateOfBirth: "1973-09-30",
			licenseNumber: "PSY-2000-005",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations: "Anxiety, Sleep Disorders, Insomnia",
			methods: "CBT-I, Relaxation Techniques",
			languages: "English, Urdu, Hindi",
			bio: "Specializing in the intersection of mental health and sleep. Helping patients overcome insomnia and anxiety-related sleep issues.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 20,
			rating: "4.95",
			reviewCount: 267,
			amountInPaise: 250000,
		},
		{
			name: "David Miller",
			gender: "male",
			dateOfBirth: "1991-06-08",
			licenseNumber: "LPC-2013-006",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "Depression, Motivation, Life Transitions",
			methods: "Psychodynamic Therapy, Existential Therapy",
			languages: "English",
			bio: "Supporting men and women through life's major transitions and helping them find meaning and motivation during depressive episodes.",
			commStyle: "direct",
			tone: "motivational",
			exp: 7,
			rating: "4.55",
			reviewCount: 68,
			amountInPaise: 100000,
		},
		{
			name: "Dr. Elena Rodriguez",
			gender: "female",
			dateOfBirth: "1976-12-19",
			licenseNumber: "PSY-2003-007",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "Trauma, Child & Adolescent Therapy",
			methods: "Play Therapy, Trauma-Focused CBT",
			languages: "English, Spanish",
			bio: "Empowering children and teens to overcome trauma and developmental challenges through evidence-based, clinical approaches.",
			commStyle: "analytical",
			tone: "clinical",
			exp: 18,
			rating: "4.88",
			reviewCount: 215,
			amountInPaise: 175000,
		},
		{
			name: "Sarah Jenkins",
			gender: "female",
			dateOfBirth: "1993-04-25",
			licenseNumber: "LPC-2015-008",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "Anxiety, Social Phobia, Self-Esteem",
			methods: "Compassion-Focused Therapy, ACT",
			languages: "English",
			bio: "Helping individuals build self-compassion and overcome social anxiety to lead more fulfilling, connected lives.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 6,
			rating: "4.70",
			reviewCount: 58,
			amountInPaise: 90000,
		},
		{
			name: "Robert Taylor",
			gender: "male",
			dateOfBirth: "1965-01-11",
			licenseNumber: "PSY-1995-009",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations: "Grief, Loss, Loneliness",
			methods: "Narrative Therapy, Humanistic Approach",
			languages: "English",
			bio: "Providing a compassionate space for those navigating the difficult journey of grief and loss later in life.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 25,
			rating: "4.98",
			reviewCount: 342,
			amountInPaise: 225000,
		},
		{
			name: "Linda Wang",
			gender: "female",
			dateOfBirth: "1987-08-03",
			licenseNumber: "MFT-2009-010",
			licenseType: "Licensed Marriage and Family Therapist",
			therapistType: "counselor",
			specializations: "Stress, Mindfulness, Women's Issues",
			methods: "MBSR, Integrative Therapy",
			languages: "English, Mandarin, Cantonese",
			bio: "Focusing on women's wellbeing through mindfulness-based stress reduction and holistic emotional support.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 12,
			rating: "4.82",
			reviewCount: 134,
			amountInPaise: 140000,
		},
		// --- Additional diverse therapists ---
		{
			name: "Dr. Marcus Hayes",
			gender: "male",
			dateOfBirth: "1978-05-20",
			licenseNumber: "PSY-2006-011",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "Addiction, Substance Use, Alcohol Dependency",
			methods: "Motivational Interviewing, 12-Step Facilitation, CBT",
			languages: "English",
			bio: "Specializing in addiction recovery with 16 years of experience. I take a direct, non-judgmental approach to guide individuals toward sustained sobriety and life rebuilding.",
			commStyle: "direct",
			tone: "motivational",
			exp: 16,
			rating: "4.87",
			reviewCount: 193,
			amountInPaise: 180000,
		},
		{
			name: "Jordan Rivera",
			gender: "non-binary",
			dateOfBirth: "1992-09-14",
			licenseNumber: "LPC-2017-012",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "LGBTQ+ Identity, Gender Dysphoria, Coming Out",
			methods: "Affirmative Therapy, Narrative Therapy, ACT",
			languages: "English, Spanish",
			bio: "An affirming counselor dedicated to supporting LGBTQ+ individuals in exploring identity, navigating coming out, and building resilience in a safe, inclusive space.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 7,
			rating: "4.93",
			reviewCount: 91,
			amountInPaise: 110000,
		},
		{
			name: "Dr. Priya Subramaniam",
			gender: "female",
			dateOfBirth: "1982-01-28",
			licenseNumber: "PSY-2007-013",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations:
				"Eating Disorders, Body Image, Anorexia, Bulimia, Binge Eating",
			methods: "CBT-E, DBT, Family-Based Treatment",
			languages: "English, Tamil, Hindi",
			bio: "Committed to helping individuals heal their relationship with food and body image. I blend evidence-based clinical frameworks with deep cultural sensitivity.",
			commStyle: "gentle",
			tone: "clinical",
			exp: 14,
			rating: "4.91",
			reviewCount: 167,
			amountInPaise: 200000,
		},
		{
			name: "Dr. Nathan Cole",
			gender: "male",
			dateOfBirth: "1980-11-03",
			licenseNumber: "PSY-2006-014",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "OCD, Intrusive Thoughts, Compulsive Behaviors",
			methods: "ERP, Inference-Based CBT, ACT",
			languages: "English",
			bio: "Expert in OCD and intrusive thought cycles, using Exposure and Response Prevention to help patients break free from compulsive patterns with a direct, structured approach.",
			commStyle: "direct",
			tone: "clinical",
			exp: 18,
			rating: "4.90",
			reviewCount: 224,
			amountInPaise: 220000,
		},
		{
			name: "Dr. Fatima Al-Hassan",
			gender: "female",
			dateOfBirth: "1974-06-17",
			licenseNumber: "PSY-2002-015",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations: "Bipolar Disorder, Mood Disorders, Mania, Cyclothymia",
			methods: "Psychoeducation, CBT, Interpersonal & Social Rhythm Therapy",
			languages: "English, Arabic",
			bio: "Over 20 years of experience in managing bipolar and mood disorders. I help clients understand their mood cycles and build stable, structured routines for long-term wellness.",
			commStyle: "analytical",
			tone: "clinical",
			exp: 22,
			rating: "4.89",
			reviewCount: 289,
			amountInPaise: 260000,
		},
		{
			name: "Chris Henderson",
			gender: "male",
			dateOfBirth: "1986-03-09",
			licenseNumber: "LPC-2012-016",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "Men's Mental Health, Masculinity, Emotional Avoidance",
			methods: "Psychodynamic Therapy, Acceptance-Based Therapy",
			languages: "English",
			bio: "Creating a judgment-free zone for men to explore emotions, challenge toxic masculinity, and build genuine emotional intelligence and vulnerability.",
			commStyle: "direct",
			tone: "motivational",
			exp: 9,
			rating: "4.74",
			reviewCount: 98,
			amountInPaise: 115000,
		},
		{
			name: "Dr. Meera Nair",
			gender: "female",
			dateOfBirth: "1988-12-02",
			licenseNumber: "PSY-2013-017",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations: "ADHD, Autism Spectrum, Neurodiversity",
			methods: "Cognitive Rehabilitation, Behavioral Coaching, Mindfulness",
			languages: "English, Malayalam, Hindi",
			bio: "Helping neurodiverse individuals understand their unique minds, develop executive function strategies, and thrive in school, work, and relationships.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 11,
			rating: "4.86",
			reviewCount: 128,
			amountInPaise: 160000,
		},
		{
			name: "Dr. Kevin Park",
			gender: "male",
			dateOfBirth: "1984-08-25",
			licenseNumber: "PSY-2010-018",
			licenseType: "Licensed Sport Psychologist",
			therapistType: "psychologist",
			specializations:
				"Sports Performance, Performance Anxiety, Fear of Failure",
			methods: "Mental Skills Training, Visualization, CBT",
			languages: "English, Korean",
			bio: "Former competitive swimmer turned sports psychologist. I work with athletes of all levels to overcome mental blocks, build confidence, and achieve peak performance.",
			commStyle: "direct",
			tone: "motivational",
			exp: 12,
			rating: "4.80",
			reviewCount: 140,
			amountInPaise: 170000,
		},
		{
			name: "Dr. Ananya Krishnamurthy",
			gender: "female",
			dateOfBirth: "1981-04-11",
			licenseNumber: "PSY-2007-019",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations:
				"Cultural Identity, Acculturation, Immigrant Mental Health",
			methods:
				"Multicultural Therapy, Narrative Therapy, Psychodynamic Therapy",
			languages: "English, Hindi, Kannada, Telugu",
			bio: "Bridging cultural worlds for diaspora individuals and immigrants navigating identity conflict, family expectations, and the challenges of acculturation.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 15,
			rating: "4.93",
			reviewCount: 186,
			amountInPaise: 165000,
		},
		{
			name: "Dr. Rachel Foster",
			gender: "female",
			dateOfBirth: "1989-07-06",
			licenseNumber: "PSY-2014-020",
			licenseType: "Licensed Psychologist",
			therapistType: "psychologist",
			specializations:
				"Postpartum Depression, Perinatal Mental Health, Pregnancy Loss",
			methods: "Interpersonal Therapy, CBT, EMDR",
			languages: "English",
			bio: "Dedicated to supporting mothers through perinatal mood disorders, postpartum anxiety, and the emotional complexity of pregnancy and early parenthood.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 9,
			rating: "4.95",
			reviewCount: 124,
			amountInPaise: 145000,
		},
		{
			name: "Dr. Arjun Mehta",
			gender: "male",
			dateOfBirth: "1977-10-30",
			licenseNumber: "PSY-2004-021",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "Anger Management, Emotional Regulation, Aggression",
			methods: "CBT, Mindfulness-Based Anger Management, Psychodynamic Therapy",
			languages: "English, Hindi, Gujarati",
			bio: "Helping individuals understand the roots of their anger, identify triggers, and develop healthier emotional regulation strategies for relationships and work.",
			commStyle: "analytical",
			tone: "clinical",
			exp: 19,
			rating: "4.77",
			reviewCount: 231,
			amountInPaise: 185000,
		},
		{
			name: "Dr. Claire Bennett",
			gender: "female",
			dateOfBirth: "1975-02-22",
			licenseNumber: "PSY-2003-022",
			licenseType: "Licensed Health Psychologist",
			therapistType: "psychologist",
			specializations: "Chronic Illness, Chronic Pain, Medical Trauma",
			methods: "ACT, Health Psychology, Pain Coping Strategies",
			languages: "English",
			bio: "Specializing in the psychological impact of chronic illness and pain. I help patients reclaim quality of life, find meaning, and build resilience in the face of ongoing health challenges.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 20,
			rating: "4.88",
			reviewCount: 256,
			amountInPaise: 210000,
		},
		{
			name: "Dr. Yuki Tanaka",
			gender: "female",
			dateOfBirth: "1983-05-16",
			licenseNumber: "PSY-2009-023",
			licenseType: "Licensed Clinical Psychologist",
			therapistType: "psychologist",
			specializations: "Personality Disorders, BPD, Emotional Dysregulation",
			methods: "DBT, Schema Therapy, MBT",
			languages: "English, Japanese",
			bio: "Expert in dialectical behavior therapy for borderline personality disorder. I help clients build distress tolerance, interpersonal effectiveness, and a stable sense of self.",
			commStyle: "analytical",
			tone: "clinical",
			exp: 14,
			rating: "4.84",
			reviewCount: 162,
			amountInPaise: 195000,
		},
		{
			name: "Samuel Okafor",
			gender: "male",
			dateOfBirth: "1990-08-19",
			licenseNumber: "LPC-2016-024",
			licenseType: "Licensed Professional Counselor",
			therapistType: "counselor",
			specializations: "Financial Stress, Life Transitions, Existential Crisis",
			methods: "Solution-Focused Therapy, Existential Therapy, Coaching",
			languages: "English, Igbo",
			bio: "Supporting young professionals through financial anxiety, major life changes, and questions of purpose. I take a motivational, forward-looking approach to help you build the life you want.",
			commStyle: "direct",
			tone: "motivational",
			exp: 8,
			rating: "4.68",
			reviewCount: 79,
			amountInPaise: 95000,
		},
		{
			name: "Dr. Sunita Patel",
			gender: "female",
			dateOfBirth: "1969-03-05",
			licenseNumber: "PSY-1997-025",
			licenseType: "Licensed Clinical Geropsychologist",
			therapistType: "psychologist",
			specializations:
				"Geriatric Mental Health, Dementia Caregivers, Late-Life Depression",
			methods: "Life Review Therapy, CBT, Mindfulness",
			languages: "English, Gujarati, Hindi",
			bio: "Over 25 years serving the mental health needs of older adults and their families. I specialise in late-life depression, caregiver burnout, and the emotional challenges of aging.",
			commStyle: "gentle",
			tone: "empathetic",
			exp: 27,
			rating: "4.96",
			reviewCount: 378,
			amountInPaise: 230000,
		},
	];

	const credentials: { name: string; email: string; password: string }[] = [];
	const DEFAULT_PASSWORD = "Therapist@123";

	// ── Clean up any stale seed rows from previous runs ──────────────────────
	// Deletes users whose emails end in @example.com or @seed.internal.
	// Cascading FK deletes will remove account, therapistProfile, and
	// therapistReview rows automatically.
	console.log("🧹 Cleaning up previous seed data...");
	const { sql } = await import("drizzle-orm");
	await db.execute(
		sql`DELETE FROM "user" WHERE email LIKE '%@example.com' OR email LIKE '%@seed.internal'`,
	);

	// ── Seed a small pool of anonymous reviewer users ──────────────────────────
	// These are minimal user rows (no full patient profile) that satisfy the FK
	// on therapist_review.patientId. reviewCount and rating on therapistProfile
	// are denormalized caches derived from these rows — updated atomically when
	// a real review is written or deleted.
	const REVIEWER_COUNT = 40;
	const reviewerIds: string[] = [];
	console.log("\n👥 Creating reviewer user pool...");
	for (let i = 0; i < REVIEWER_COUNT; i++) {
		// Deterministic IDs so re-runs don't create duplicates
		const rid = `seed-reviewer-${String(i + 1).padStart(3, "0")}`;
		reviewerIds.push(rid);
		await db
			.insert(user)
			.values({
				id: rid,
				name: `Reviewer ${i + 1}`,
				email: `reviewer${i + 1}@seed.internal`,
				emailVerified: true,
				role: "patient",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any)
			.onConflictDoNothing();
	}

	// Helper: generate N reviews whose average approximates targetRating
	function buildReviews(
		therapistProfileId: string,
		count: number,
		targetRating: number,
	) {
		// Distribute ratings around the target so the average is close
		const reviews: {
			id: string;
			therapistId: string;
			patientId: string;
			rating: number;
			comment: string | null;
			createdAt: Date;
		}[] = [];
		let ratingSum = 0;
		for (let i = 0; i < count; i++) {
			const reviewer = reviewerIds[i % reviewerIds.length];
			// For the last review snap the rating to hit the target average
			let r: number;
			if (i < count - 1) {
				r = Math.min(
					5,
					Math.max(1, Math.round(targetRating + (Math.random() - 0.5) * 1.2)),
				);
			} else {
				r = Math.min(
					5,
					Math.max(1, Math.round(targetRating * count - ratingSum)),
				);
			}
			ratingSum += r;
			const createdAt = new Date(
				Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
			);
			reviews.push({
				id: `seed-review-${therapistProfileId}-${i}`,
				therapistId: therapistProfileId,
				patientId: reviewer,
				rating: r,
				comment: null,
				createdAt,
			});
		}
		return reviews;
	}

	for (const t of therapistsData) {
		// Deterministic IDs based on license number — safe to re-run
		const userId = `seed-therapist-${t.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
		const profileId = `seed-profile-${t.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
		const email = t.name.toLowerCase().replace(/[^a-z]/g, "") + "@example.com";

		console.log(`- Seeding ${t.name} (${email})...`);

		// 1. Create User
		await db
			.insert(user)
			.values({
				id: userId,
				name: t.name,
				email: email,
				emailVerified: true,
				role: "therapist",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any)
			.onConflictDoNothing();

		// 2. Create credential Account (so therapist can log in with email + password)
		const hashedPw = hashPassword(DEFAULT_PASSWORD);
		await db
			.insert(account)
			.values({
				id: `seed-account-${t.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
				accountId: userId,
				providerId: "credential",
				userId: userId,
				password: hashedPw,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any)
			.onConflictDoNothing();

		// 3. Pre-compute reviews so we can store derived cache on the profile row
		const reviews = buildReviews(
			profileId,
			t.reviewCount,
			parseFloat(t.rating),
		);
		const actualCount = reviews.length;
		const actualRating = (
			reviews.reduce((s, r) => s + r.rating, 0) / actualCount
		).toFixed(2);

		// 4. Create Therapist Profile — with reviewCount/rating derived from reviews
		await db
			.insert(therapistProfile)
			.values({
				id: profileId,
				userId: userId,
				firstName: t.name.split(" ")[0],
				lastName: t.name.split(" ").slice(1).join(" "),
				phoneNumber:
					"+91" + Math.floor(6000000000 + Math.random() * 4000000000),
				bio: t.bio,
				gender: t.gender,
				dateOfBirth: t.dateOfBirth,
				licenseNumber: t.licenseNumber,
				licenseType: t.licenseType,
				therapistType: t.therapistType,
				specializations: t.specializations,
				therapyMethods: t.methods,
				languages: t.languages,
				yearsOfExperience: t.exp,
				amountInPaise: t.amountInPaise,
				reviewCount: actualCount, // cache — kept in sync with therapist_review rows
				rating: actualRating, // cache — kept in sync with therapist_review rows
				isVerified: true,
				isAvailable: true,
				status: "offline",
				communicationStyle: t.commStyle as any,
				tone: t.tone as any,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any)
			.onConflictDoNothing();

		// 5. Insert review rows (FK → therapist_profile.id, must come after step 4)
		for (const rev of reviews) {
			await db
				.insert(therapistReview)
				.values(rev as any)
				.onConflictDoNothing();
		}

		// 6. Create Recommendation Indexing doc
		const indexTextList = [
			t.bio,
			`Specializes in: ${t.specializations}`,
			`Methods: ${t.methods}`,
			`Style: ${t.commStyle}, ${t.tone}`,
			`Experience: ${t.exp} years`,
			`Languages: ${t.languages}`,
			`License: ${t.licenseType}`,
			`Type: ${t.therapistType}`,
		];
		const indexText = indexTextList.filter(Boolean).join(". ");

		await TherapistEmbedding.findOneAndUpdate(
			{ therapistId: profileId },
			{ therapistId: profileId, indexText: indexText },
			{ upsert: true, new: true },
		);

		credentials.push({ name: t.name, email, password: DEFAULT_PASSWORD });
	}

	console.log(
		"\n✅ Successfully seeded 25 therapist profiles with real review rows!\n",
	);
	console.log("📋 Therapist Login Credentials:");
	console.log("─".repeat(65));
	console.log(`${"Name".padEnd(25)} ${"Email".padEnd(35)} Password`);
	console.log("─".repeat(65));
	for (const c of credentials) {
		console.log(`${c.name.padEnd(25)} ${c.email.padEnd(35)} ${c.password}`);
	}
	console.log("─".repeat(65));

	await mongoose.disconnect();
	await client.end();
}

seed().catch((err) => {
	console.error("❌ Seeding failed:", err);
	process.exit(1);
});
