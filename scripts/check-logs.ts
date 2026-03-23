import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/therapychat_logs';
const client = new MongoClient(uri);

async function checkLogs() {
  try {
    await client.connect();
    const db = client.db();
    const logs = db.collection('logs');
    
    console.log('🔍 Fetching last 10 logs...');
    const results = await logs.find({}).sort({ timestamp: -1 }).limit(10).toArray();
    
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await client.close();
  }
}

checkLogs().catch(console.error);
