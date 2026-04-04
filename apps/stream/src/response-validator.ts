// ─── Layer 1: Blocklist Regex ─────────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
	/\b(kill yourself|end it|overdose|how to die|cut yourself)\b/i,
	/\b(no point in living|nobody cares if you)\b/i,
	/\b(alcohol|drugs) (to cope|will help)\b/i,
	/\b(suicide method|painless death|painlessly)\b/i,
	/\b(take\s+\w+\s+mg|increase your dose|stop your medication)\b/i,
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
		.replace(/^#+\s.*$/gm, "") // headers
		.replace(/^\s*[-*•]\s+/gm, "") // bullets
		.replace(/\d+\.\s+/g, "") // numbered lists
		.trim();

	const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
	const firstSentence = sentences[0]?.trim() ?? clean;
	const firstWords = firstSentence.split(/\s+/).filter(Boolean);
	if (firstWords.length <= 3) {
		return /[.!?]$/.test(firstSentence) ? firstSentence : `${firstSentence}.`;
	}
	const clause = firstSentence.split(/[,:;()-]/)[0]?.trim() ?? firstSentence;
	const words = clause.split(/\s+/).filter(Boolean);
	const shortened = words.slice(0, 18).join(" ").trim();
	if (!shortened) return "I'm here with you.";
	if (shortened.split(/\s+/).length <= 2) {
		return /[.!?]$/.test(firstSentence) ? firstSentence : `${firstSentence}.`;
	}
	return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
}

// ─── Main Validator ───────────────────────────────────────────────────────────
export async function validateCrisisResponse(raw: string): Promise<string> {
	// Layer 1: Blocklist
	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.test(raw)) {
			console.warn(
				"[SafetyValidator] Layer 1 BLOCKED — dangerous pattern detected.",
			);
			return randomFallback();
		}
	}

	// Layer 2: Length/format
	const trimmed = enforceLength(raw);

	return trimmed;
}
