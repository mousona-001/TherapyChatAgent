// -------------------------------------------------------
// Profile Feature Domain Port
// Defines what operations the application layer needs from
// any underlying data/infrastructure implementation.
// -------------------------------------------------------

export const PROFILE_PORT = Symbol('PROFILE_PORT');

export type TherapistProfileData = {
  phoneNumber: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  licenseNumber?: string;
  licenseType?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  isAvailable?: boolean;
  amountInPaise?: number;
  languages?: string[];
};

export type PatientProfileData = {
  phoneNumber: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  assignedTherapistId?: string;
  reasonForSeeking?: string;
};

export interface IProfilePort {
  createTherapistProfile(userId: string, data: TherapistProfileData): Promise<unknown>;
  createPatientProfile(userId: string, data: PatientProfileData): Promise<unknown>;
  getTherapistProfileByUserId(userId: string): Promise<unknown>;
  getPatientProfileByUserId(userId: string): Promise<unknown>;
  updateTherapistProfile(userId: string, data: Partial<TherapistProfileData>): Promise<unknown>;
  updatePatientProfile(userId: string, data: Partial<PatientProfileData>): Promise<unknown>;
}
