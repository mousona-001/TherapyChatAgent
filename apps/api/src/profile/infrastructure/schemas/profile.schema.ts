import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../../../database/schema";

export const therapistProfile = pgTable("therapist_profile", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phoneNumber: text("phone_number").notNull(),
	bio: text("bio"),
	avatarUrl: text("avatar_url"),
	dateOfBirth: date("date_of_birth"),
	gender: text("gender"),
	therapistType: text("therapist_type"),
	licenseNumber: text("license_number"),
	licenseType: text("license_type"),
	specializations: text("specializations"),
	yearsOfExperience: integer("years_of_experience"),
	isVerified: boolean("is_verified").notNull().default(false),
	isAvailable: boolean("is_available").notNull().default(true),
	// Availability-aware routing: manual + presence-based
	status: text("status", { enum: ["online", "busy", "unavailable", "offline"] })
		.notNull()
		.default("offline"),
	// AI persona style markers
	communicationStyle: text("communication_style", {
		enum: ["gentle", "direct", "analytical"],
	}),
	tone: text("tone", { enum: ["empathetic", "motivational", "clinical"] }),
	therapyMethods: text("therapy_methods"), // JSON array: ["CBT","DBT"]
	// Ranking
	rating: numeric("rating", { precision: 3, scale: 2 }).default("5.00"),
	reviewCount: integer("review_count").default(0),
	amountInPaise: integer("amount_in_paise"),
	razorpayAccountId: text("razorpay_account_id"),
	razorpayAccountStatus: text("razorpay_account_status").default("pending"),
	languages: text("languages"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

/**
 * therapist_review — source of truth for reviews.
 * reviewCount and rating on therapistProfile are denormalized caches —
 * they are updated atomically whenever a review is written or deleted.
 */
export const therapistReview = pgTable(
	"therapist_review",
	{
		id: text("id").primaryKey(),
		therapistId: text("therapist_id")
			.notNull()
			.references(() => therapistProfile.id, { onDelete: "cascade" }),
		// nullable so the row survives if the patient account is deleted
		patientId: text("patient_id").references(() => user.id, {
			onDelete: "set null",
		}),
		rating: integer("rating").notNull(), // 1–5
		comment: text("comment"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("idx_review_therapist").on(t.therapistId),
		index("idx_review_patient").on(t.patientId),
	],
);

export const patientProfile = pgTable("patient_profile", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phoneNumber: text("phone_number").notNull(),
	bio: text("bio"),
	avatarUrl: text("avatar_url"),
	dateOfBirth: date("date_of_birth"),
	gender: text("gender"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactPhone: text("emergency_contact_phone"),
	assignedTherapistId: text("assigned_therapist_id").references(
		() => therapistProfile.id,
		{ onDelete: "set null" },
	),
	reasonForSeeking: text("reason_for_seeking"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});
