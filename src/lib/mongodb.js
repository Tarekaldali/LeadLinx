import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().then(c => {
    console.log('✅ [DB] Successfully connected to MongoDB');
    return c;
  }).catch(err => {
    console.error('❌ [DB] Failed to connect to MongoDB:', err.message);
    throw err;
  });
}

export default clientPromise;

let isInitialized = false;

export async function getDb() {
  const client = await clientPromise;
  const db = client.db('leadlinx');

  if (!isInitialized) {
    try {
      const collections = ['users', 'searches', 'leads', 'alerts', 'subscriptions', 'logs', 'blog', 'saved_leads', 'ai_usage', 'chats'];
      const existingCollections = await db.listCollections().toArray();
      const existingNames = existingCollections.map(c => c.name);

      for (const name of collections) {
        if (!existingNames.includes(name)) {
          await db.createCollection(name);
        }
      }

      // One-time migration: bump free users with < 400 credits to 400
      try {
        await db.collection('users').updateMany(
          { plan: 'free', credits: { $lt: 400 } },
          { $set: { credits: 400 } }
        );
      } catch { /* silent */ }

      isInitialized = true;
    } catch (error) {
      console.warn('Could not auto-create collections:', error.message);
    }
  }

  return db;
}
