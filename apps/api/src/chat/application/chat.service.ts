import { Injectable, Inject } from '@nestjs/common';
import { ITherapistPort, THERAPIST_PORT } from '../domain/therapist.port';

@Injectable()
export class ChatService {
  constructor(
    @Inject(THERAPIST_PORT)
    private readonly therapist: ITherapistPort,
  ) {}

  async processMessage(message: string, patientId: string): Promise<string> {
    // Additional business logic could go here before/after relying on infrastructure
    return this.therapist.getResponse(message, patientId);
  }
}
