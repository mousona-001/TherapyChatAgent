import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage } from '@langchain/core/messages';
import { db } from '../../database/db';
import { therapistProfile, patientProfile, user } from '../../database/schema';
import { therapistConnection } from '../../connection/infrastructure/schemas/connection.schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { TherapistEmbedding } from '../schemas/therapist-embedding.schema';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly embeddingModel: ChatGroq;

  constructor(
    @InjectModel(TherapistEmbedding.name)
    private readonly embeddingModel_: Model<TherapistEmbedding>,
  ) {
    this.embeddingModel = new ChatGroq({
      model: 'llama-3.3-70b-versatile',
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
      therapist.bio ?? '',
      `Specializes in: ${therapist.specializations ?? ''}`,
      `Methods: ${therapist.therapyMethods ?? ''}`,
      `Style: ${therapist.communicationStyle ?? ''}, ${therapist.tone ?? ''}`,
      `Experience: ${therapist.yearsOfExperience ?? 0} years`,
    ]
      .filter(Boolean)
      .join('. ');

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
  ): Promise<any[]> {
    // 1. Normalize query terms
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);

    // 2. Fetch all embedding docs that match at least one query term
    const queryRegex = queryTerms.map(t => new RegExp(t, 'i'));
    const candidates = await this.embeddingModel_
      .find({ indexText: { $in: queryRegex } })
      .lean();

    const candidateIds = candidates.map(c => c.therapistId);

    // 3. Fetch full therapist profiles for candidates to get rating + status
    // If no semantic candidates, fall back to keyword LIKE on Postgres
    let profiles: any[] = [];

    if (candidateIds.length > 0) {
      this.logger.debug(`[Recommendation] Found ${candidateIds.length} semantic candidates: ${candidateIds.join(', ')}`);
      // Fetch matched profiles WITH user names
      profiles = await db
        .select({
          profile: therapistProfile,
          user: user,
        })
        .from(therapistProfile)
        .innerJoin(user, eq(therapistProfile.userId, user.id))
        .where(and(
          inArray(therapistProfile.id, candidateIds),
          eq(therapistProfile.isVerified, true),
        ));
      this.logger.debug(`[Recommendation] Found ${profiles.length} profiles for candidates.`);
    }

    // Keyword fallback: if still empty, search Postgres directly
    if (profiles.length === 0) {
      const likeQuery = `%${queryTerms[0] ?? query}%`;
      const fallbackResults = await db
        .select({
          profile: therapistProfile,
          user: user,
        })
        .from(therapistProfile)
        .innerJoin(user, eq(therapistProfile.userId, user.id))
        .where(and(
          eq(therapistProfile.isVerified, true),
          sql`(${therapistProfile.specializations} ILIKE ${likeQuery} OR ${therapistProfile.therapyMethods} ILIKE ${likeQuery} OR ${therapistProfile.bio} ILIKE ${likeQuery})`,
        ));
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
          .select({ therapistId: therapistConnection.therapistId, status: therapistConnection.status })
          .from(therapistConnection)
          .where(eq(therapistConnection.patientId, patientProfileRow.id))
      : [];

    const connectedTherapistIds = new Set(
      existingConnections
        .filter(c => c.status === 'accepted')
        .map(c => c.therapistId),
    );

    // 5. Score each profile
    const scored = profiles.map(p => {
      const { profile, user: userData } = p as any;
      
      // Semantic score: ratio of query terms found in indexText
      const indexEntry = candidates.find(c => c.therapistId === profile.id);
      const indexText = indexEntry?.indexText?.toLowerCase() ?? '';
      const matchedTerms = queryTerms.filter(t => indexText.includes(t)).length;
      const semanticScore = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0.5;

      // Availability score
      const availabilityScore =
        profile.status === 'online' ? 1.0
        : profile.status === 'busy' ? 0.5
        : 0.0;

      // Rating score (0-5 → 0-1)
      const ratingScore = parseFloat(profile.rating as string ?? '5') / 5;

      // Past interaction score
      const pastInteractionScore = connectedTherapistIds.has(profile.id) ? 0.8 : 0.0;

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
        score: Math.round(finalScore * 100) / 100,
      };
    });

    // 6. Sort descending, limit
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
