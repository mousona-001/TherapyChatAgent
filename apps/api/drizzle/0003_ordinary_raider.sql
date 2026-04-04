CREATE TABLE "therapist_review" (
	"id" text PRIMARY KEY NOT NULL,
	"therapist_id" text NOT NULL,
	"patient_id" text,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "therapist_review" ADD CONSTRAINT "therapist_review_therapist_id_therapist_profile_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapist_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_review" ADD CONSTRAINT "therapist_review_patient_id_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_therapist" ON "therapist_review" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_review_patient" ON "therapist_review" USING btree ("patient_id");