import { pgTable, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';
import { user } from '../../../database/schema';

export const therapistProfile = pgTable('therapist_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),
  licenseNumber: text('license_number'),
  licenseType: text('license_type'),       
  specializations: text('specializations'), 
  yearsOfExperience: integer('years_of_experience'),
  isVerified: boolean('is_verified').notNull().default(false),
  isAvailable: boolean('is_available').notNull().default(true),
  amountInPaise: integer('amount_in_paise'), 
  razorpayAccountId: text('razorpay_account_id'),
  razorpayAccountStatus: text('razorpay_account_status').default('pending'),
  languages: text('languages'),             
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const patientProfile = pgTable('patient_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  assignedTherapistId: text('assigned_therapist_id')
    .references(() => therapistProfile.id, { onDelete: 'set null' }),
  reasonForSeeking: text('reason_for_seeking'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
