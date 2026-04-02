import { HumanMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { eq, inArray, sql } from "drizzle-orm";
import { Model } from "mongoose";
import { therapistConnection } from "../../connection/infrastructure/schemas/connection.schema";
import { db } from "../../database/db";
import { patientProfile, therapistProfile, user } from "../../database/schema";
import { TherapistEmbedding } from "../schemas/therapist-embedding.schema";

@Injectable()
export class RecommendationService {
	private readonly logger = new Logger(RecommendationService.name);
	private readonly embeddingModel: ChatGroq;

	constructor(
		@InjectModel(TherapistEmbedding.name)
		private readonly embeddingModel_: Model<TherapistEmbedding>,
	) {
		this.embeddingModel = new ChatGroq({
			model: "llama-3.3-70b-versatile",
			temperature: 0,
			apiKey: process.env.GROQ_API_KEY,
		});
	}

	/**
	 * Generate and store an embedding for a therapist when their profile is created/updated.
	 * The text is built from their bio, specializations, and therapeutic style.
	 */
	async indexTherapist(therapistId: string): Promise<void> {
		const [therapist] = await db
			.select()
			.from(therapistProfile)
			.where(eq(therapistProfile.id, therapistId));

		if (!therapist) return;

		const text = [
			therapist.bio ?? "",
			`Specializes in: ${therapist.specializations ?? ""}`,
			`Methods: ${therapist.therapyMethods ?? ""}`,
			`Style: ${therapist.communicationStyle ?? ""}, ${therapist.tone ?? ""}`,
			`Experience: ${therapist.yearsOfExperience ?? 0} years`,
			therapist.therapistType ? `Role: ${therapist.therapistType}` : "",
		]
			.filter(Boolean)
			.join(". ");

		// Use the LLM to generate a condensed keyword vector (since Groq doesn't offer embeddings)
		// We store the source text and use BM25-style keyword matching as the fallback
		await this.embeddingModel_.findOneAndUpdate(
			{ therapistId },
			{ therapistId, indexText: text, updatedAt: new Date() },
			{ upsert: true, new: true },
		);

		this.logger.log(`[Recommendation] Indexed therapist ${therapistId}`);
	}

	/**
	 * Return ranked therapist recommendations for a patient query.
	 * Uses hybrid scoring: semantic keywords + availability + rating + past interaction.
	 */
	async getRecommendations(
		patientUserId: string,
		query: string,
		limit = 5,
		expand = false,
	): Promise<any[]> {
		// When expand=true, use the LLM to semantically expand the query into richer keywords
		let effectiveQuery = query;
		if (expand && query.trim()) {
			try {
				const expanded = await this.embeddingModel.invoke([
					new HumanMessage(
						`Given this therapy need: "${query}", generate 10-12 specific therapy keywords, approaches, specializations, or mental health conditions that would match practitioners who can help. Reply with ONLY a comma-separated list of keywords, no explanation.`,
					),
				]);
				const expandedText =
					typeof expanded.content === "string" ? expanded.content.trim() : "";
				if (expandedText) {
					effectiveQuery = expandedText;
					this.logger.log(
						`[Recommendation] Expanded query: "${effectiveQuery}"`,
					);
				}
			} catch {
				this.logger.warn(
					"[Recommendation] Query expansion failed, using original query",
				);
			}
		}

		// 1. Normalize query terms
		const queryTerms = effectiveQuery
			.toLowerCase()
			.split(/[\s,]+/)
			.filter((t) => t.length > 2);

		// 2. Fetch all embedding docs that match at least one query term
		const queryRegex = queryTerms.map((t) => new RegExp(t, "i"));
		const candidates = await this.embeddingModel_
			.find({ indexText: { $in: queryRegex } })
			.lean();

		const candidateIds = candidates.map((c) => c.therapistId);

		// 3. Fetch full therapist profiles for candidates to get rating + status
		// If no semantic candidates, fall back to keyword LIKE on Postgres
		let profiles: any[] = [];

		if (candidateIds.length > 0) {
			this.logger.debug(
				`[Recommendation] Found ${candidateIds.length} semantic candidates: ${candidateIds.join(", ")}`,
			);
			// Fetch matched profiles WITH user names
			profiles = await db
				.select({
					profile: therapistProfile,
					user: user,
				})
				.from(therapistProfile)
				.innerJoin(user, eq(therapistProfile.userId, user.id))
				.where(inArray(therapistProfile.id, candidateIds));
			this.logger.debug(
				`[Recommendation] Found ${profiles.length} profiles for candidates.`,
			);
		}

		// Keyword fallback: if still empty, search Postgres directly
		if (profiles.length === 0) {
			const likeQuery = `%${queryTerms[0] ?? effectiveQuery}%`;
			const fallbackResults = await db
				.select({
					profile: therapistProfile,
					user: user,
				})
				.from(therapistProfile)
				.innerJoin(user, eq(therapistProfile.userId, user.id))
				.where(
					sql`(${therapistProfile.specializations} ILIKE ${likeQuery} OR ${therapistProfile.therapyMethods} ILIKE ${likeQuery} OR ${therapistProfile.bio} ILIKE ${likeQuery})`,
				);
			profiles = fallbackResults;
		}

		// 4. Find patient's existing connections for pastInteractionScore
		let patientProfileRow: typeof patientProfile.$inferSelect | undefined;
		const [patientRow] = await db
			.select()
			.from(patientProfile)
			.where(eq(patientProfile.userId, patientUserId));
		patientProfileRow = patientRow;

		const existingConnections = patientProfileRow
			? await db
					.select({
						therapistId: therapistConnection.therapistId,
						status: therapistConnection.status,
					})
					.from(therapistConnection)
					.where(eq(therapistConnection.patientId, patientProfileRow.id))
			: [];

		const connectedTherapistIds = new Set(
			existingConnections
				.filter((c) => c.status === "accepted")
				.map((c) => c.therapistId),
		);

		// Exclude therapists that already have any connection with this patient (any status)
		const excludedTherapistIds = new Set(
			existingConnections.map((c) => c.therapistId),
		);
		if (excludedTherapistIds.size > 0) {
			profiles = profiles.filter(
				(p) => !excludedTherapistIds.has((p as any).profile.id),
			);
		}

		// 5. Score each profile
		const scored = profiles.map((p) => {
			const { profile, user: userData } = p as any;

			// Semantic score: ratio of query terms found in indexText
			const indexEntry = candidates.find((c) => c.therapistId === profile.id);
			const indexText = indexEntry?.indexText?.toLowerCase() ?? "";
			const matchedTerms = queryTerms.filter((t) =>
				indexText.includes(t),
			).length;
			const semanticScore =
				queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0.5;

			// Availability score
			const availabilityScore =
				profile.status === "online"
					? 1.0
					: profile.status === "busy"
						? 0.5
						: 0.0;

			// Rating score (0-5 → 0-1)
			const ratingScore = parseFloat((profile.rating as string) ?? "5") / 5;

			// Past interaction score
			const pastInteractionScore = connectedTherapistIds.has(profile.id)
				? 0.8
				: 0.0;

			const finalScore =
				0.5 * semanticScore +
				0.2 * availabilityScore +
				0.2 * ratingScore +
				0.1 * pastInteractionScore;

			return {
				therapistId: profile.id,
				name: userData.name,
				specializations: profile.specializations,
				therapyMethods: profile.therapyMethods,
				communicationStyle: profile.communicationStyle,
				tone: profile.tone,
				rating: profile.rating,
				status: profile.status,
				yearsOfExperience: profile.yearsOfExperience,
				therapistType: profile.therapistType,
				reviewCount: profile.reviewCount,
				bio: profile.bio,
				score: Math.round(finalScore * 100) / 100,
			};
		});

		// 6. Sort descending, limit
		return scored.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Direct text search for therapists by name, specialization, bio, or therapy methods.
	 * Used by the search input — does not need patient profile context.
	 * Returns paginated results with a total count so the client can decide whether to load more.
	 */
	async searchTherapists(
		query: string,
		limit = 8,
		offset = 0,
	): Promise<{ results: any[]; total: number }> {
		const term = query.trim();
		if (!term) return { results: [], total: 0 };

		const likePattern = `%${term}%`;

		const whereClause = sql`(
			${user.name} ILIKE ${likePattern}
			OR ${therapistProfile.specializations} ILIKE ${likePattern}
			OR ${therapistProfile.bio} ILIKE ${likePattern}
			OR ${therapistProfile.therapyMethods} ILIKE ${likePattern}
			OR ${therapistProfile.therapistType} ILIKE ${likePattern}
		)`;

		const [{ total }] = await db
			.select({ total: sql<number>`cast(count(*) as integer)` })
			.from(therapistProfile)
			.innerJoin(user, eq(therapistProfile.userId, user.id))
			.where(whereClause);

		const rows = await db
			.select({
				profile: therapistProfile,
				user: user,
			})
			.from(therapistProfile)
			.innerJoin(user, eq(therapistProfile.userId, user.id))
			.where(whereClause)
			.limit(limit)
			.offset(offset);

		return {
			results: rows.map(({ profile, user: userData }) => ({
				therapistId: profile.id,
				name: userData.name,
				specializations: profile.specializations,
				therapyMethods: profile.therapyMethods,
				communicationStyle: profile.communicationStyle,
				tone: profile.tone,
				rating: profile.rating,
				status: profile.status,
				yearsOfExperience: profile.yearsOfExperience,
				therapistType: profile.therapistType,
				reviewCount: profile.reviewCount,
				bio: profile.bio,
				score: 1,
			})),
			total: Number(total),
		};
	}
}
