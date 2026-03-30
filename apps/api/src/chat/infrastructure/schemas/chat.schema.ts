import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

// ── Chat Session ──────────────────────────────────────────────────────────────
// A session is scoped to (userId, connectionId).
// connectionId links it to a specific therapist_connection row.
// null connectionId = pure AI-only session (no therapist involved).
export const chatSession = pgTable('chat_session', {
  id: uuid('id').primaryKey(),
  userId: text('user_id').notNull(),
  // Nullable: null = no therapist, pure AI chat
  connectionId: uuid('connection_id'),
  // True when AI is covering (therapist offline/busy/unavailable)
  isAiActive: boolean('is_ai_active').notNull().default(true),
  // Session memory — updated async after each AI turn
  chatSummary: text('chat_summary'),
  emotionalState: text('emotional_state'),     // e.g. "anxious", "calm"
  lastTopics: text('last_topics'),             // JSON array
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
