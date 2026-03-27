export const THERAPIST_PORT = Symbol('THERAPIST_PORT');

export interface ITherapistPort {
  getResponse(userMessage: string, patientId: string): Promise<string>;
}
