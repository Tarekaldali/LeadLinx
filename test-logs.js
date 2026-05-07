const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://tarekaldali1234_db_user_LIU_32230767:RvaDceIllGY8LbS7@cluster0.dkxv0or.mongodb.net/?appName=Cluster0';

async function checkLogs() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('leadlinx');
    
    const logs = await db.collection('logs').find({ type: 'error', action: 'search' }).sort({ timestamp: -1 }).limit(1).toArray();
    console.log(logs);
    
  } finally {
    await client.close();
  }
}
checkLogs();
