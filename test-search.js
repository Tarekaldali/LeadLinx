const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = 'mongodb+srv://tarekaldali1234_db_user_LIU_32230767:RvaDceIllGY8LbS7@cluster0.dkxv0or.mongodb.net/?appName=Cluster0';
const JWT_SECRET = 'leadlinx_jwt_secret_key_2024_production_x9k2m';

async function testSearch() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('leadlinx'); 
    
    let user = await db.collection('users').findOne({});
    if (!user) {
      console.log('No user found, creating test user...');
      const res = await db.collection('users').insertOne({
        email: 'test@leadlinx.com',
        plan: 'free',
        credits: 1000
      });
      user = await db.collection('users').findOne({ _id: res.insertedId });
    }
    console.log('Testing with user:', user.email);

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { credits: 1000 } }
    );

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated token. Sending request...');
    
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/leads/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}` // Try cookie first
      },
      body: JSON.stringify({
        keywords: "marketing automation tool",
        negativeKeywords: ["free", "open source"]
      })
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Time: ${Date.now() - startTime}ms`);
    console.log(`Response:`, text.substring(0, 1000) + '...');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testSearch();
