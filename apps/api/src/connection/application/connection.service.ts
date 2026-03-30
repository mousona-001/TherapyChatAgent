import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../../database/db';
import { therapistConnection } from '../infrastructure/schemas/connection.schema';
import { patientProfile, therapistProfile, user } from '../../database/schema';
import { RequestConnectionDto, RespondConnectionDto } from '../dto/connection.dto';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { chatSession } from '../../chat/infrastructure/schemas/chat.schema';

@Injectable()
export class ConnectionService {

  // ── Patient: Request a connection ────────────────────────────────────────────
  async requestConnection(patientUserId: string, dto: RequestConnectionDto) {
    // 1. Find patient profile
    const [patient] = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, patientUserId));
    if (!patient) throw new BadRequestException('Patient profile not found');

    // 2. Verify therapist exists
    const [therapist] = await db
      .select()
      .from(therapistProfile)
      .where(eq(therapistProfile.id, dto.therapistId));
    if (!therapist) throw new NotFoundException('Therapist not found');

    // 3. Prevent duplicate requests (unique constraint will also catch it)
    const existing = await db
      .select()
      .from(therapistConnection)
      .where(and(
        eq(therapistConnection.patientId, patient.id),
        eq(therapistConnection.therapistId, dto.therapistId),
      ));
    if (existing.length > 0 && existing[0].status !== 'rejected') {
      throw new BadRequestException(`Connection already exists with status: ${existing[0].status}`);
    }

    // 4. Create (or re-request after rejection)
    const [connection] = await db
      .insert(therapistConnection)
      .values({
        id: randomUUID(),
        patientId: patient.id,
        therapistId: dto.therapistId,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: [therapistConnection.patientId, therapistConnection.therapistId],
        set: { status: 'pending', updatedAt: new Date() },
      })
      .returning();

    return connection;
  }

  // ── Therapist: Accept or Reject ──────────────────────────────────────────────
  async respondToConnection(therapistUserId: string, connectionId: string, dto: RespondConnectionDto) {
    // 1. Find therapist profile
    const [therapist] = await db
      .select()
      .from(therapistProfile)
      .where(eq(therapistProfile.userId, therapistUserId));
    if (!therapist) throw new NotFoundException('Therapist profile not found');

    // 2. Find connection and verify ownership
    const [connection] = await db
      .select()
      .from(therapistConnection)
      .where(and(
        eq(therapistConnection.id, connectionId),
        eq(therapistConnection.therapistId, therapist.id),
      ));
    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.status !== 'pending') {
      throw new BadRequestException(`Cannot respond to a connection with status: ${connection.status}`);
    }

    // 3. Update status
    const [updated] = await db
      .update(therapistConnection)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(therapistConnection.id, connectionId))
      .returning();

    return updated;
  }

  // ── List connections (both roles) ────────────────────────────────────────────
  async listConnections(userId: string, role: 'patient' | 'therapist') {
    if (role === 'patient') {
      const [patient] = await db
        .select()
        .from(patientProfile)
        .where(eq(patientProfile.userId, userId));
      if (!patient) throw new NotFoundException('Patient profile not found');

      return db
        .select({
          id: therapistConnection.id,
          status: therapistConnection.status,
          createdAt: therapistConnection.createdAt,
          updatedAt: therapistConnection.updatedAt,
          therapistId: therapistConnection.therapistId,
          therapistName: user.name,
          therapistUserId: therapistProfile.userId,
          therapistRating: therapistProfile.rating,
          therapistReviewCount: therapistProfile.reviewCount,
          therapistStatus: therapistProfile.status,
          sessionId: chatSession.id,
        })
        .from(therapistConnection)
        .innerJoin(therapistProfile, eq(therapistConnection.therapistId, therapistProfile.id))
        .innerJoin(user, eq(therapistProfile.userId, user.id))
        .leftJoin(chatSession, eq(chatSession.connectionId, therapistConnection.id))
        .where(eq(therapistConnection.patientId, patient.id));
    } else {
      const [therapist] = await db
        .select()
        .from(therapistProfile)
        .where(eq(therapistProfile.userId, userId));
      if (!therapist) throw new NotFoundException('Therapist profile not found');

      return db
        .select({
          id: therapistConnection.id,
          status: therapistConnection.status,
          createdAt: therapistConnection.createdAt,
          updatedAt: therapistConnection.updatedAt,
          patientId: therapistConnection.patientId,
          patientName: user.name,
          patientUserId: patientProfile.userId,
          patientReason: patientProfile.reasonForSeeking,
          sessionId: chatSession.id,
        })
        .from(therapistConnection)
        .innerJoin(patientProfile, eq(therapistConnection.patientId, patientProfile.id))
        .innerJoin(user, eq(patientProfile.userId, user.id))
        .leftJoin(chatSession, eq(chatSession.connectionId, therapistConnection.id))
        .where(eq(therapistConnection.therapistId, therapist.id));
    }
  }

  // ── Therapist: Toggle availability status ────────────────────────────────────
  async updateStatus(therapistUserId: string, status: 'available' | 'unavailable' | 'busy') {
    // Map manual statuses to schema statuses
    const statusMap: Record<string, string> = {
      available: 'online',
      unavailable: 'unavailable',
      busy: 'busy',
    };

    const [therapist] = await db
      .update(therapistProfile)
      .set({ status: statusMap[status] as any, isAvailable: status === 'available', updatedAt: new Date() })
      .where(eq(therapistProfile.userId, therapistUserId))
      .returning({ id: therapistProfile.id, status: therapistProfile.status });

    if (!therapist) throw new NotFoundException('Therapist profile not found');
    return therapist;
  }

  // ── Patient: Submit feedback (rating & review) ──────────────────────────────
  async submitFeedback(patientUserId: string, connectionId: string, dto: { rating: number; review: string }) {
    // 1. Find patient profile
    const [patient] = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, patientUserId));
    if (!patient) throw new NotFoundException('Patient profile not found');

    // 2. Find connection and verify ownership
    const [connection] = await db
      .select()
      .from(therapistConnection)
      .where(and(
        eq(therapistConnection.id, connectionId),
        eq(therapistConnection.patientId, patient.id),
      ));
    if (!connection) throw new NotFoundException('Connection not found or permission denied');
    if (connection.status !== 'accepted' && connection.status !== 'ended') {
      throw new BadRequestException('Can only give feedback for active or ended connections');
    }

    // 3. Update connection
    const [updated] = await db
      .update(therapistConnection)
      .set({ rating: dto.rating, review: dto.review, updatedAt: new Date() })
      .where(eq(therapistConnection.id, connectionId))
      .returning();

    // 4. Recalculate therapist's average rating (Async)
    this.updateTherapistAverageRating(connection.therapistId).catch(err => 
      console.error(`[Analytics] Failed to update therapist rating: ${err}`)
    );

    return updated;
  }

  private async updateTherapistAverageRating(therapistId: string) {
    const connections = await db
      .select({ rating: therapistConnection.rating })
      .from(therapistConnection)
      .where(and(
        eq(therapistConnection.therapistId, therapistId),
        // Only count if rating is present
      ));
    
    const validRatings = connections.filter(c => c.rating !== null).map(c => c.rating as number);
    if (validRatings.length === 0) return;

    const avg = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
    
    await db
      .update(therapistProfile)
      .set({ rating: avg.toFixed(2), reviewCount: validRatings.length, updatedAt: new Date() })
      .where(eq(therapistProfile.id, therapistId));
  }

  // ── Public: Get reviews for a therapist ────────────────────────────────────
  async getTherapistReviews(therapistId: string) {
    return db
      .select({
        rating: therapistConnection.rating,
        review: therapistConnection.review,
        createdAt: therapistConnection.createdAt,
      })
      .from(therapistConnection)
      .where(and(
        eq(therapistConnection.therapistId, therapistId),
        // Only return if there is a review or rating
      ))
      .orderBy(desc(therapistConnection.createdAt));
  }
}
