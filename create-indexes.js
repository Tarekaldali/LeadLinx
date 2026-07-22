const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI in .env.local');
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('leadlinx');

  console.log('Creating indexes for blog...');
  await db.collection('blog').createIndex({ slug: 1 }, { unique: true });
  await db.collection('blog').createIndex({ published: 1 });
  await db.collection('blog').createIndex({ status: 1 });
  await db.collection('blog').createIndex({ lastUpdated: -1, date: -1 });

  console.log('Creating indexes for ai_usage...');
  await db.collection('ai_usage').createIndex({ type: 1 });
  await db.collection('ai_usage').createIndex({ timestamp: -1 });
  await db.collection('ai_usage').createIndex({ userId: 1 });

  console.log('Creating indexes for alerts...');
  await db.collection('alerts').createIndex({ status: 1 });
  await db.collection('alerts').createIndex({ createdAt: -1 });

  console.log('Creating indexes for chats...');
  await db.collection('chats').createIndex({ title: 1 });
  await db.collection('chats').createIndex({ updatedAt: -1 });

  console.log('Creating indexes for searches...');
  await db.collection('searches').createIndex({ query: 1 });
  await db.collection('searches').createIndex({ createdAt: -1 });

  console.log('Indexes created successfully.');
  await client.close();
}

main().catch(console.error);
