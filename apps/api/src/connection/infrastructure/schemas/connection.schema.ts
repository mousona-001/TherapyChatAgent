import {
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const therapistConnection = pgTable(
	"therapist_connection",
	{
		id: uuid("id").primaryKey(),
		patientId: text("patient_id").notNull(), // FK to patient_profile.id (enforced in code)
		therapistId: text("therapist_id").notNull(), // FK to therapist_profile.id (enforced in code)
		status: text("status", {
			enum: ["pending", "accepted", "rejected", "ended"],
		})
			.notNull()
			.default("pending"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		rating: integer("rating"), // 1-5
		review: text("review"),
		nextSession: timestamp("next_session"), // upcoming scheduled session
	},
	(table) => ({
		// One connection per patient-therapist pair
		uniqueConnection: uniqueIndex("unique_patient_therapist").on(
			table.patientId,
			table.therapistId,
		),
	}),
);
