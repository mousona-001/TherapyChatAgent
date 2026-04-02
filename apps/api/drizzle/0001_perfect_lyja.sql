CREATE TABLE "chat_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" uuid,
	"is_ai_active" boolean DEFAULT true NOT NULL,
	"chat_summary" text,
	"emotional_state" text,
	"last_topics" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapist_connection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"therapist_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"rating" integer,
	"review" text
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "therapist_type" text;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "status" text DEFAULT 'offline' NOT NULL;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "communication_style" text;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "tone" text;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "therapy_methods" text;--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "rating" numeric(3, 2) DEFAULT '5.00';--> statement-breakpoint
ALTER TABLE "therapist_profile" ADD COLUMN "review_count" integer DEFAULT 0;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_patient_therapist" ON "therapist_connection" USING btree ("patient_id","therapist_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number");