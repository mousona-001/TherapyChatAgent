import { Injectable, Inject } from '@nestjs/common';
import { IProfilePort, PROFILE_PORT, TherapistProfileData, PatientProfileData } from '../domain/profile.port';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_PORT)
    private readonly profilePort: IProfilePort,
  ) {}

  createTherapistProfile(userId: string, data: TherapistProfileData) {
    return this.profilePort.createTherapistProfile(userId, data);
  }

  createPatientProfile(userId: string, data: PatientProfileData) {
    return this.profilePort.createPatientProfile(userId, data);
  }

  getMyProfile(userId: string, role: 'therapist' | 'patient') {
    if (role === 'therapist') {
      return this.profilePort.getTherapistProfileByUserId(userId);
    }
    return this.profilePort.getPatientProfileByUserId(userId);
  }

  updateTherapistProfile(userId: string, data: Partial<TherapistProfileData>) {
    return this.profilePort.updateTherapistProfile(userId, data);
  }

  updatePatientProfile(userId: string, data: Partial<PatientProfileData>) {
    return this.profilePort.updatePatientProfile(userId, data);
  }
}
