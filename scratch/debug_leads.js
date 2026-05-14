const { getDb } = require('./src/lib/mongodb');
const { ObjectId } = require('mongodb');

async function debugLeads() {
  const db = await getDb();
  
  console.log('--- Random Leads ---');
  const sampleLeads = await db.collection('leads').find({}).limit(5).toArray();
  sampleLeads.forEach(l => {
    console.log(`Lead ID: ${l._id}, monitorId: ${l.monitorId} (${typeof l.monitorId}), searchId: ${l.searchId} (${typeof l.searchId}), userId: ${l.userId} (${typeof l.userId})`);
  });

  console.log('\n--- Monitors ---');
  const monitors = await db.collection('monitors').find({}).limit(5).toArray();
  monitors.forEach(m => {
    console.log(`Monitor ID: ${m._id}, goal: ${m.goal}`);
  });

  console.log('\n--- Searches ---');
  const searches = await db.collection('searches').find({}).limit(5).toArray();
  searches.forEach(s => {
    console.log(`Search ID: ${s._id}, query: ${s.query}`);
  });
}

debugLeads().catch(console.error).finally(() => process.exit());
