import Groq from 'groq-sdk';

// ─── Layer 1: Blocklist Regex ─────────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /\b(kill yourself|end it|overdose|how to die|cut yourself)\b/i,
  /\b(no point in living|nobody cares if you)\b/i,
  /\b(alcohol|drugs) (to cope|will help)\b/i,
  /\b(suicide method|painless death|painlessly)\b/i,
];

// ─── Layer 4: Safe Fallback Pool (human-reviewed) ────────────────────────────
const SAFE_FALLBACKS = [
  "You're not alone. You can reach the 988 Lifeline right now.",
  "I hear you. A real counsellor is available 24/7 at 988.",
  "Please stay safe. You matter. Call 988 for immediate support.",
  "Take a breath. I'm here with you. You can also text HOME to 741741.",
];

function randomFallback(): string {
  return SAFE_FALLBACKS[Math.floor(Math.random() * SAFE_FALLBACKS.length)];
}

// ─── Layer 2: Length & Format Guard ──────────────────────────────────────────
function enforceLength(text: string): string {
  // Keep only first 2 sentences. Strip lists, bullets, headers.
  const clean = text
    .replace(/^#+\s.*$/gm, '') // headers
    .replace(/^\s*[-*•]\s+/gm, '') // bullets
    .replace(/\d+\.\s+/g, '') // numbered lists
    .trim();

  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  return sentences.slice(0, 2).join(' ').trim();
}

// ─── Layer 3: Topic Containment Secondary LLM ────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function isOnTopic(text: string): Promise<boolean> {
  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 5,
      messages: [
        {
          role: 'system',
          content:
            'You are a safety classifier. Answer only YES or NO. Does the following response stay strictly within crisis de-escalation and directing the person to professional help resources? No medical advice, no coping strategies beyond breathing, no harmful content.',
        },
        { role: 'user', content: text },
      ],
    });
    const answer = result.choices[0]?.message.content?.trim().toUpperCase() ?? 'NO';
    return answer.startsWith('YES');
  } catch {
    // If classifier fails, err on side of caution — use fallback
    return false;
  }
}

// ─── Main Validator ───────────────────────────────────────────────────────────
export async function validateCrisisResponse(raw: string): Promise<string> {
  // Layer 1: Blocklist
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(raw)) {
      console.warn('[SafetyValidator] Layer 1 BLOCKED — dangerous pattern detected.');
      return randomFallback();
    }
  }

  // Layer 2: Length/format
  const trimmed = enforceLength(raw);

  // Layer 3: Topic containment (secondary LLM)
  const onTopic = await isOnTopic(trimmed);
  if (!onTopic) {
    console.warn('[SafetyValidator] Layer 3 BLOCKED — topic drift detected.');
    return randomFallback();
  }

  return trimmed;
}
