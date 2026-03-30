const postgres = require('postgres');

async function check() {
  const sql = postgres("postgresql://postgres:password@localhost:5432/therapychat");
  
  try {
    const query = 'select "id", "user_id", "first_name", "last_name", "phone_number", "bio", "avatar_url", "date_of_birth", "gender", "emergency_contact_name", "emergency_contact_phone", "assigned_therapist_id", "reason_for_seeking", "status", "created_at", "updated_at" from "patient_profile" where "patient_profile"."user_id" = $1';
    const params = ['pwXyNqdO1UAajS1L1cfU6KDN9iyzeXsm'];
    
    console.log("Running failing query...");
    const result = await sql.unsafe(query, params);
    console.log("Query Succeeded! Rows count:", result.length);
  } catch (e) {
    console.error("Query FAILED in script too:", e);
  } finally {
    await sql.end();
  }
}

check();
