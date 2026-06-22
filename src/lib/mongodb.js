import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

let clientPromise;

// Do NOT throw at module import time — that crashes SSR on Vercel if env is missing.
// Instead create a promise that will reject when first awaited so errors are surfaced
// during runtime usage rather than during module initialization.
if (!uri) {
  clientPromise = new Promise((_, reject) => {
    // Defer rejection to avoid synchronous import-time exceptions
    setTimeout(() => {
      reject(new Error('MONGODB_URI is not defined. Set MONGODB_URI in your environment.'));
    }, 0);
  });
} else {
  // Cache the MongoClient promise on globalThis to reduce connection churn
  const globalAny = globalThis;
  if (!globalAny._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    const connectPromise = client.connect().then(c => {
      console.log('✅ [DB] Successfully connected to MongoDB');
      return c;
    }).catch(err => {
      console.error('❌ [DB] Failed to connect to MongoDB:', err?.message || err);
      // We throw so awaiters fail properly, but we MUST attach a dummy catch
      // to the base promise below to prevent Node.js from crashing with Unhandled Rejection
      throw err; 
    });
    
    // Prevent unhandled promise rejection crash on Vercel container
    connectPromise.catch(() => {});
    
    globalAny._mongoClientPromise = connectPromise;
  }
  clientPromise = globalAny._mongoClientPromise;
}

export default clientPromise;

let isInitialized = false;

export async function getDb() {
  const client = await clientPromise;
  const db = client.db('leadlinx');

  // Perform initialization asynchronously (non-blocking) to avoid adding latency
  // to first request / SSR cold-starts. This runs once per process.
  if (!isInitialized) {
    isInitialized = true;
    (async () => {
      try {
        const collections = ['users', 'searches', 'leads', 'alerts', 'subscriptions', 'logs', 'blog', 'saved_leads', 'ai_usage', 'chats', 'harvested_leads', 'harvest_jobs'];
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        for (const name of collections) {
          if (!existingNames.includes(name)) {
            try {
              await db.createCollection(name);
            } catch (err) {
              console.warn(`Could not create collection ${name}:`, err?.message || err);
            }
          }
        }

        // One-time migration: bump free users with < 400 credits to 400
        try {
          await db.collection('users').updateMany(
            { plan: 'free', credits: { $lt: 400 } },
            { $set: { credits: 400 } }
          );
        } catch (err) {
          console.warn('Migration (credit bump) failed:', err?.message || err);
        }
      } catch (error) {
        console.warn('Could not auto-create collections or run migrations:', error?.message || error);
      }
    })();
  }

  return db;
}
