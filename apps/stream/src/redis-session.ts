import Redis from 'ioredis';

export type CallState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

export interface ConversationTurn {
  role: 'patient' | 'agent';
  text: string;
}

const CALL_TTL = 1800; // 30 minutes

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redisClient;
}

export async function setState(callSid: string, state: CallState): Promise<void> {
  await getRedis().setex(`call:${callSid}:state`, CALL_TTL, state);
}

export async function getState(callSid: string): Promise<CallState> {
  const val = await getRedis().get(`call:${callSid}:state`);
  return (val as CallState) || 'IDLE';
}

export async function setPatientId(callSid: string, patientId: string): Promise<void> {
  await getRedis().setex(`call:${callSid}:patientId`, CALL_TTL, patientId);
}

export async function getPatientId(callSid: string): Promise<string | null> {
  return getRedis().get(`call:${callSid}:patientId`);
}

export async function appendHistory(callSid: string, turn: ConversationTurn): Promise<void> {
  const key = `call:${callSid}:history`;
  await getRedis().rpush(key, JSON.stringify(turn));
  await getRedis().expire(key, CALL_TTL);
  // Keep last 20 turns
  await getRedis().ltrim(key, -20, -1);
}

export async function getHistory(callSid: string): Promise<ConversationTurn[]> {
  const items = await getRedis().lrange(`call:${callSid}:history`, 0, -1);
  return items.map(i => JSON.parse(i) as ConversationTurn);
}

export async function cleanupCall(callSid: string): Promise<void> {
  const keys = [
    `call:${callSid}:state`,
    `call:${callSid}:patientId`,
    `call:${callSid}:history`,
  ];
  await getRedis().del(...keys);
}

/**
 * Subscribe to the crisis:initiate Redis channel to learn about new calls
 * published by apps/api when it creates a Twilio outbound call.
 */
export function subscribeToCallInit(
  onCall: (data: { callSid: string; patientId: string }) => void,
): void {
  const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  sub.subscribe('crisis:initiate');
  sub.on('message', (_channel, message) => {
    try {
      const data = JSON.parse(message) as { callSid: string; patientId: string };
      onCall(data);
    } catch (e) {
      console.error('[Redis] Failed to parse crisis:initiate message', e);
    }
  });
}
