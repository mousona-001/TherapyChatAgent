import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { Model } from "mongoose";
import { therapistConnection } from "../../connection/infrastructure/schemas/connection.schema";
import { db } from "../../database/db";
import { patientProfile, therapistProfile } from "../../database/schema";
import {
	ChatMessageDocument,
	ChatMessageMongo,
} from "./schemas/chat-message.schema";
import { chatSession } from "./schemas/chat.schema";

export interface ChatMessageRecord {
	role: "user" | "assistant";
	content: string;
	senderId?: string;
}

@Injectable()
export class ChatHistoryRepository {
	constructor(
		@InjectModel(ChatMessageMongo.name)
		private readonly messageModel: Model<ChatMessageDocument>,
	) {}

	/**
	 * Returns (or creates) the active Postgres session for a user,
	 * then loads all messages for that session from MongoDB.
	 */
	async getOrCreateSession(userId: string): Promise<{
		sessionId: string;
		messages: ChatMessageRecord[];
	}> {
		// ── Postgres: find or create the session ─────────────────────────────────
		const sessions = await db
			.select()
			.from(chatSession)
			.where(eq(chatSession.userId, userId))
			.orderBy(asc(chatSession.createdAt));

		let sessionId: string;
		if (sessions.length === 0) {
			const [created] = await db
				.insert(chatSession)
				.values({ id: randomUUID(), userId })
				.returning();
			sessionId = created.id;
		} else {
			sessionId = sessions[sessions.length - 1].id;
		}

		// ── MongoDB: load messages for this session ───────────────────────────────
		const docs = await this.messageModel
			.find({ sessionId })
			.sort({ createdAt: 1 })
			.lean()
			.exec();

		return {
			sessionId,
			messages: docs.map((d) => ({
				role: d.role,
				content: d.content,
				senderId: d.senderId,
			})),
		};
	}

	/** Get a specific session for a user, ensuring they own it. */
	async getSession(
		sessionId: string,
		userId: string,
	): Promise<{
		sessionId: string;
		messages: ChatMessageRecord[];
	}> {
		const [session] = await db
			.select()
			.from(chatSession)
			.where(
				and(eq(chatSession.id, sessionId), eq(chatSession.userId, userId)),
			);

		if (!session) {
			throw new Error("Session not found or access denied");
		}

		const docs = await this.messageModel
			.find({ sessionId })
			.sort({ createdAt: 1 })
			.lean()
			.exec();

		return {
			sessionId,
			messages: docs.map((d) => ({
				role: d.role,
				content: d.content,
				senderId: d.senderId,
			})),
		};
	}

	/**
	 * Load message history for a session by sessionId only (no ownership check).
	 * Use this in streaming/AI paths where access is already verified at join time.
	 */
	async getMessagesForSession(sessionId: string): Promise<ChatMessageRecord[]> {
		const docs = await this.messageModel
			.find({ sessionId })
			.sort({ createdAt: 1 })
			.lean()
			.exec();
		return docs.map((d) => ({
			role: d.role,
			content: d.content,
			senderId: d.senderId,
		}));
	}

	/** Persist a single message turn to MongoDB. */
	async addMessage(
		sessionId: string,
		role: "user" | "assistant",
		content: string,
		senderId?: string,
	): Promise<void> {
		await this.messageModel.create({ sessionId, role, content, senderId });

		// Keep the Postgres session's updatedAt current
		await db
			.update(chatSession)
			.set({ updatedAt: new Date() })
			.where(eq(chatSession.id, sessionId));
	}

	/** Start a brand-new session (e.g. user clicks "New Chat"), or get/create one for a connection. */
	async createNewSession(
		userId: string,
		connectionId?: string,
		forceNew = false,
	): Promise<string> {
		if (connectionId) {
			// Enforce: connection must be accepted before a chat session can be created
			const [conn] = await db
				.select({ status: therapistConnection.status })
				.from(therapistConnection)
				.where(eq(therapistConnection.id, connectionId));

			if (!conn) throw new NotFoundException("Connection not found");
			if (conn.status !== "accepted") {
				throw new ForbiddenException(
					"Chat is not available yet. The therapist must accept your request first.",
				);
			}

			if (!forceNew) {
				const [existing] = await db
					.select()
					.from(chatSession)
					.where(eq(chatSession.connectionId, connectionId))
					.orderBy(desc(chatSession.createdAt));

				if (existing) return existing.id;
			}
		}

		const [created] = await db
			.insert(chatSession)
			.values({
				id: randomUUID(),
				userId,
				connectionId,
			})
			.returning();
		return created.id;
	}

	/** List all sessions for a user, newest first. */
	async getSessions(userId: string) {
		// 1. Find all connections this user is involved in (as patient or therapist)
		const userConnections = await db
			.select({ id: therapistConnection.id })
			.from(therapistConnection)
			.leftJoin(
				patientProfile,
				eq(therapistConnection.patientId, patientProfile.id),
			)
			.leftJoin(
				therapistProfile,
				eq(therapistConnection.therapistId, therapistProfile.id),
			)
			.where(
				or(
					eq(patientProfile.userId, userId),
					eq(therapistProfile.userId, userId),
				),
			);

		const connectionIds = userConnections.map((c) => c.id);

		// 2. Return sessions where the user is the owner OR the session is linked to their connection
		const filters = [eq(chatSession.userId, userId)];
		if (connectionIds.length > 0) {
			filters.push(inArray(chatSession.connectionId, connectionIds));
		}

		return db
			.select()
			.from(chatSession)
			.where(or(...filters))
			.orderBy(asc(chatSession.createdAt));
	}

	/** Get all messages for a specific session from MongoDB. */
	async getMessages(
		sessionId: string,
	): Promise<(ChatMessageRecord & { createdAt: Date })[]> {
		const docs = await this.messageModel
			.find({ sessionId })
			.sort({ createdAt: 1 })
			.lean()
			.exec();
		return docs.map((d) => ({
			role: d.role as "user" | "assistant",
			content: d.content,
			senderId: d.senderId,
			createdAt: (d as any).createdAt as Date,
		}));
	}

	/** Persist session memory fields to Postgres (called async after each AI turn). */
	async updateSessionMemory(
		sessionId: string,
		data: {
			chatSummary?: string;
			emotionalState?: string;
			lastTopics?: string;
		},
	): Promise<void> {
		await db
			.update(chatSession)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(chatSession.id, sessionId));
	}
}
