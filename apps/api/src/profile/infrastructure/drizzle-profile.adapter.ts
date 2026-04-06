import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../database/db";
import { patientProfile, therapistProfile, user } from "../../database/schema";
import {
	IProfilePort,
	PatientProfileData,
	TherapistProfileData,
} from "../domain/profile.port";

@Injectable()
export class DrizzleProfileAdapter implements IProfilePort {
	async createTherapistProfile(userId: string, data: TherapistProfileData) {
		const [created] = await db
			.insert(therapistProfile)
			.values({
				id: randomUUID(),
				userId,
				firstName: data.firstName,
				lastName: data.lastName,
				phoneNumber: data.phoneNumber,
				bio: data.bio ?? null,
				avatarUrl: data.avatarUrl ?? null,
				dateOfBirth: data.dateOfBirth ?? null,
				gender: data.gender ?? null,
				therapistType: data.therapistType ?? null,
				licenseNumber: data.licenseNumber ?? null,
				licenseType: data.licenseType ?? null,
				specializations: data.specializations
					? JSON.stringify(data.specializations)
					: null,
				yearsOfExperience: data.yearsOfExperience ?? null,
				isAvailable: data.isAvailable ?? true,
				amountInPaise: data.amountInPaise ?? null,
				languages: data.languages ? JSON.stringify(data.languages) : null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: therapistProfile.userId,
				set: {
					firstName: data.firstName,
					lastName: data.lastName,
					phoneNumber: data.phoneNumber,
					bio: data.bio ?? null,
					avatarUrl: data.avatarUrl ?? null,
					dateOfBirth: data.dateOfBirth ?? null,
					gender: data.gender ?? null,
					therapistType: data.therapistType ?? null,
					licenseNumber: data.licenseNumber ?? null,
					licenseType: data.licenseType ?? null,
					specializations: data.specializations
						? JSON.stringify(data.specializations)
						: null,
					yearsOfExperience: data.yearsOfExperience ?? null,
					isAvailable: data.isAvailable ?? true,
					amountInPaise: data.amountInPaise ?? null,
					languages: data.languages ? JSON.stringify(data.languages) : null,
					updatedAt: new Date(),
				},
			})
			.returning();

		// ── UPDATE USER ROLE ───────────────────────────────────────────────────
		await db.update(user).set({ role: "therapist" }).where(eq(user.id, userId));

		return created;
	}

	async createPatientProfile(userId: string, data: PatientProfileData) {
		const [created] = await db
			.insert(patientProfile)
			.values({
				id: randomUUID(),
				userId,
				firstName: data.firstName,
				lastName: data.lastName,
				phoneNumber: data.phoneNumber,
				bio: data.bio ?? null,
				avatarUrl: data.avatarUrl ?? null,
				dateOfBirth: data.dateOfBirth ?? null,
				gender: data.gender ?? null,
				emergencyContactName: data.emergencyContactName ?? null,
				emergencyContactPhone: data.emergencyContactPhone ?? null,
				reasonForSeeking: data.reasonForSeeking ?? null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: patientProfile.userId,
				set: {
					firstName: data.firstName,
					lastName: data.lastName,
					phoneNumber: data.phoneNumber,
					bio: data.bio ?? null,
					avatarUrl: data.avatarUrl ?? null,
					dateOfBirth: data.dateOfBirth ?? null,
					gender: data.gender ?? null,
					emergencyContactName: data.emergencyContactName ?? null,
					emergencyContactPhone: data.emergencyContactPhone ?? null,
					reasonForSeeking: data.reasonForSeeking ?? null,
					updatedAt: new Date(),
				},
			})
			.returning();

		// ── UPDATE USER ROLE ───────────────────────────────────────────────────
		await db.update(user).set({ role: "patient" }).where(eq(user.id, userId));

		return created;
	}

	async getTherapistProfileByUserId(userId: string) {
		const [result] = await db
			.select({
				profile: therapistProfile,
				user: {
					phoneNumberVerified: user.phoneNumberVerified,
				},
			})
			.from(therapistProfile)
			.innerJoin(user, eq(therapistProfile.userId, user.id))
			.where(eq(therapistProfile.userId, userId));

		if (!result) return null;
		return {
			...result.profile,
			isPhoneVerified: result.user.phoneNumberVerified,
		};
	}

	async getPatientProfileByUserId(userId: string) {
		const [result] = await db
			.select({
				profile: patientProfile,
				user: {
					phoneNumberVerified: user.phoneNumberVerified,
				},
			})
			.from(patientProfile)
			.innerJoin(user, eq(patientProfile.userId, user.id))
			.where(eq(patientProfile.userId, userId));

		if (!result) return null;
		return {
			...result.profile,
			isPhoneVerified: result.user.phoneNumberVerified,
		};
	}

	async updateTherapistProfile(
		userId: string,
		data: Partial<TherapistProfileData>,
	) {
		const [updated] = await db
			.update(therapistProfile)
			.set({
				...(data.phoneNumber !== undefined && {
					phoneNumber: data.phoneNumber,
				}),
				...(data.bio !== undefined && { bio: data.bio }),
				...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
				...(data.dateOfBirth !== undefined && {
					dateOfBirth: data.dateOfBirth,
				}),
				...(data.gender !== undefined && { gender: data.gender }),
				...(data.therapistType !== undefined && {
					therapistType: data.therapistType,
				}),
				...(data.licenseNumber !== undefined && {
					licenseNumber: data.licenseNumber,
				}),
				...(data.licenseType !== undefined && {
					licenseType: data.licenseType,
				}),
				...(data.specializations !== undefined && {
					specializations: JSON.stringify(data.specializations),
				}),
				...(data.yearsOfExperience !== undefined && {
					yearsOfExperience: data.yearsOfExperience,
				}),
				...(data.isAvailable !== undefined && {
					isAvailable: data.isAvailable,
				}),
				...(data.amountInPaise !== undefined && {
					amountInPaise: data.amountInPaise,
				}),
				...(data.languages !== undefined && {
					languages: JSON.stringify(data.languages),
				}),
				updatedAt: new Date(),
			})
			.where(eq(therapistProfile.userId, userId))
			.returning();
		return updated;
	}

	async updatePatientProfile(
		userId: string,
		data: Partial<PatientProfileData>,
	) {
		const [updated] = await db
			.update(patientProfile)
			.set({
				...(data.phoneNumber !== undefined && {
					phoneNumber: data.phoneNumber,
				}),
				...(data.bio !== undefined && { bio: data.bio }),
				...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
				...(data.dateOfBirth !== undefined && {
					dateOfBirth: data.dateOfBirth,
				}),
				...(data.gender !== undefined && { gender: data.gender }),
				...(data.emergencyContactName !== undefined && {
					emergencyContactName: data.emergencyContactName,
				}),
				...(data.emergencyContactPhone !== undefined && {
					emergencyContactPhone: data.emergencyContactPhone,
				}),
				...(data.reasonForSeeking !== undefined && {
					reasonForSeeking: data.reasonForSeeking,
				}),
				updatedAt: new Date(),
			})
			.where(eq(patientProfile.userId, userId))
			.returning();
		return updated;
	}

	async resetPhoneVerification(userId: string) {
		await db
			.update(user)
			.set({ phoneNumberVerified: false })
			.where(eq(user.id, userId));
	}
}
