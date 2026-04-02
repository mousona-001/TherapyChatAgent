/**
 * Seed next session dates for accepted therapist connections.
 * Sets a random future date (1–14 days out) on every accepted connection
 * that doesn't already have one.
 */
import * as dotenv from "dotenv";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as path from "path";
import postgres from "postgres";
import { therapistConnection } from "../src/connection/infrastructure/schemas/connection.schema";

dotenv.config({ path: path.join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
	console.error("❌ DATABASE_URL is not defined in .env");
	process.exit(1);
}

function randomFutureDate(minDays = 1, maxDays = 14): Date {
	const ms =
		(minDays + Math.random() * (maxDays - minDays)) * 24 * 60 * 60 * 1000;
	// Round to nearest half hour for a realistic look
	const raw = Date.now() + ms;
	const rounded = Math.round(raw / (30 * 60 * 1000)) * (30 * 60 * 1000);
	return new Date(rounded);
}

async function main() {
	const client = postgres(DATABASE_URL, { max: 1 });
	const db = drizzle(client);

	// Find all accepted connections without a next session date
	const toUpdate = await db
		.select({ id: therapistConnection.id })
		.from(therapistConnection)
		.where(
			and(
				eq(therapistConnection.status, "accepted"),
				isNull(therapistConnection.nextSession),
			),
		);

	if (toUpdate.length === 0) {
		console.log("ℹ️  No accepted connections without a next session found.");
		await client.end();
		return;
	}

	console.log(
		`📅 Seeding next session dates for ${toUpdate.length} connection(s)…`,
	);

	for (const conn of toUpdate) {
		const nextSession = randomFutureDate(1, 14);
		await db
			.update(therapistConnection)
			.set({ nextSession, updatedAt: new Date() })
			.where(eq(therapistConnection.id, conn.id));
		console.log(`  ✓ ${conn.id} → ${nextSession.toLocaleString()}`);
	}

	console.log("✅  Done seeding next sessions.");
	await client.end();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
