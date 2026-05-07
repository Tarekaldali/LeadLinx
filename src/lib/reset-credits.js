const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

/**
 * LeadLinx Debug Script
 * Use this to manually reset user credits and plans for testing.
 * Run via: node src/lib/reset-credits.js
 */
async function resetCredits() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in .env.local");
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("🔌 Connected to MongoDB...");
    const db = client.db('leadlinx');
    
    // Update all users to have 5000 credits and Pro plan for testing
    const result = await db.collection('users').updateMany(
      {},
      { 
        $set: { 
          credits: 5000, 
          plan: 'pro',
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`✅ Success! Updated ${result.modifiedCount} users with 5000 credits and Pro plan.`);
  } catch (error) {
    console.error("❌ Database Error:", error);
  } finally {
    await client.close();
  }
}

resetCredits();
