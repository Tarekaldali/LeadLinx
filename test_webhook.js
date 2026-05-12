// No require needed for fetch in Node 18+

// 1. Change this to your email
const EMAIL = 'tarekaldali1234@gmail.com'; 

// 2. Change this to the plan you want to test: 'plus', 'pro', or 'enterprise'
const PLAN = 'pro'; 

async function simulateWebhook() {
  try {
    // We need to find the user ID first
    const { MongoClient } = require('mongodb');
    require('dotenv').config({ path: '.env.local' });
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('leadlinx');
    const user = await db.collection('users').findOne({ email: EMAIL });
    
    if (!user) {
      console.error(`❌ User with email ${EMAIL} not found in database.`);
      process.exit(1);
    }

    const userId = user._id.toString();
    const credits = PLAN === 'plus' ? 1000 : PLAN === 'pro' ? 2000 : 5000;

    console.log(`🚀 Simulating payment for ${EMAIL} (ID: ${userId})...`);

    const payload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test_manual',
          subscription: 'sub_test_manual',
          metadata: {
            userId: userId,
            planKey: PLAN,
            credits: credits.toString()
          }
        }
      }
    };

    const response = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ Server Response:', result);
    console.log('\nCheck your dashboard now! Your credits and plan should be updated.');

  } catch (error) {
    console.error('❌ Error simulating webhook:', error.message);
    console.log('Make sure your dev server is running (npm run dev) on localhost:3000');
  } finally {
    process.exit();
  }
}

simulateWebhook();
