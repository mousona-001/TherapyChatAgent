export const THERAPIST_PORT = Symbol('THERAPIST_PORT');

export interface ITherapistPort {
  getResponse(userMessage: string, patientId: string, sessionId?: string): Promise<string>;
  streamResponse(userMessage: string, patientId: string, sessionId: string): Promise<AsyncIterable<any>>;
  updateSessionMemory(sessionId: string, lastAiResponse: string): Promise<void>;
}
