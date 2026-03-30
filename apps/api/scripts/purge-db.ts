import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root of the api package
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in .env');
  process.exit(1);
}

async function purge() {
  console.log('🧹 Purging database...');
  const sql = postgres(connectionString!);
  
  try {
    // We use the same table names found in the schemas
    await sql.unsafe(`
      TRUNCATE TABLE 
        "user", 
        "session", 
        "account", 
        "verification", 
        "therapist_profile", 
        "patient_profile", 
        "subscription", 
        "appointment", 
        "processed_webhook_event", 
        "chat_session", 
        "therapist_connection" 
      CASCADE;
    `);
    console.log('✅ Database purged successfully!');
  } catch (error) {
    console.error('❌ Failed to purge database:', error);
  } finally {
    await sql.end();
  }
}

purge();
