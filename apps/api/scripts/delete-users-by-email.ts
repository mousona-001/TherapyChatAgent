import * as dotenv from "dotenv";
import * as path from "path";
import postgres from "postgres";

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error("❌ DATABASE_URL is not defined in .env");
	process.exit(1);
}

const EMAILS_TO_DELETE = [
	"sayandutta02473@gmail.com",
	"msouhonaacharjee01@gmail.com",
];

async function deleteUsers() {
	const sql = postgres(connectionString!);

	try {
		// Fetch matching users first so we can report what will be deleted
		const rows = await sql<
			{ id: string; email: string; role: string | null }[]
		>`
      SELECT id, email, role FROM "user"
      WHERE email = ${EMAILS_TO_DELETE[0]} OR email = ${EMAILS_TO_DELETE[1]}
    `;

		if (rows.length === 0) {
			console.log(
				"ℹ️  No users found with those email addresses. Nothing deleted.",
			);
			return;
		}

		console.log(`Found ${rows.length} user(s) to delete:`);
		for (const r of rows) {
			console.log(`  • ${r.email}  (id: ${r.id}, role: ${r.role ?? "none"})`);
		}

		// Cascade delete: all child rows (session, account, profile, chat, connections,
		// subscriptions, appointments) are removed automatically via ON DELETE CASCADE.
		await sql`
      DELETE FROM "user"
      WHERE email = ${EMAILS_TO_DELETE[0]} OR email = ${EMAILS_TO_DELETE[1]}
    `;

		console.log(`✅ Deleted ${rows.length} user(s) and all associated data.`);
	} catch (err) {
		console.error("❌ Deletion failed:", err);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

deleteUsers();
