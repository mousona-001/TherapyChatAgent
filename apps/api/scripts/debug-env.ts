import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load from current dir
dotenv.config();

console.log("CWD:", process.cwd());
console.log("DB_URL from .env (CWD):", process.env.DATABASE_URL);

// Try to load from apps/api
dotenv.config({ path: path.join(__dirname, '../.env') });
console.log("DB_URL from ../.env (relative to script):", process.env.DATABASE_URL);
