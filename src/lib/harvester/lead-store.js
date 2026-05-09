/**
 * LeadHarvester — MongoDB Lead Store
 * CRUD operations for harvested_leads collection + export utilities.
 */

import { emailHash } from './lead-dedup.js';

/**
 * Ensure indexes exist on the harvested_leads collection.
 */
export async function ensureIndexes(db) {
  const col = db.collection('harvested_leads');
  try {
    await col.createIndex({ email_hash: 1 }, { unique: true, sparse: true });
    await col.createIndex({ user_id: 1, created_at: -1 });
    await col.createIndex({ job_id: 1 });
    await col.createIndex({ score: -1 });
  } catch (err) {
    // Indexes may already exist
    if (!err.message.includes('already exists')) {
      console.warn('[LeadStore] Index creation warning:', err.message);
    }
  }
}

/**
 * Insert a single lead. Returns the inserted document or null if duplicate.
 */
export async function insertLead(db, lead) {
  const doc = {
    canonical_name: lead.canonical_name || '',
    emails: lead.emails || [],
    email_hash: lead.emails?.[0] ? emailHash(lead.emails[0]) : null,
    phones: lead.phones || [],
    company: lead.company || '',
    title: lead.title || '',
    source_url: lead.source_url || '',
    score: lead.score || 0,
    score_breakdown: lead.score_breakdown || {},
    intent_score: lead.intent_score || 0,
    lead_type: lead.lead_type || 'Direct-Contact',
    reason: lead.reason || '',
    suggested_reply: lead.suggested_reply || '',
    enriched: lead.enriched || false,
    enrichment_data: lead.enrichment_data || {},
    job_id: lead.job_id || null,
    user_id: lead.user_id || null,
    created_at: new Date(),
    last_seen: new Date(),
    social_profiles: lead.social_profiles || {},
    page_title: lead.page_title || '',
    site_name: lead.site_name || '',
  };

  try {
    const result = await db.collection('harvested_leads').insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — update last_seen instead
      await db.collection('harvested_leads').updateOne(
        { email_hash: doc.email_hash },
        { $set: { last_seen: new Date() }, $max: { score: doc.score } }
      );
      return null;
    }
    throw err;
  }
}

/**
 * Insert multiple leads in bulk.
 */
export async function insertLeadsBulk(db, leads) {
  const inserted = [];
  const duplicates = [];

  for (const lead of leads) {
    const result = await insertLead(db, lead);
    if (result) {
      inserted.push(result);
    } else {
      duplicates.push(lead);
    }
  }

  return { inserted, duplicates, total: leads.length };
}

/**
 * Find leads by job ID.
 */
export async function findByJobId(db, jobId) {
  return db.collection('harvested_leads')
    .find({ job_id: jobId })
    .sort({ score: -1 })
    .toArray();
}

/**
 * Find leads by user ID with pagination.
 */
export async function findByUserId(db, userId, { page = 1, pageSize = 50, minScore = 0 } = {}) {
  const filter = { user_id: userId };
  if (minScore > 0) filter.score = { $gte: minScore };

  const [leads, total] = await Promise.all([
    db.collection('harvested_leads')
      .find(filter)
      .sort({ score: -1, created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection('harvested_leads').countDocuments(filter),
  ]);

  return { leads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Export leads as JSON Lines string.
 */
export function exportToJSONL(leads) {
  return leads.map(l => JSON.stringify(l)).join('\n');
}

/**
 * Export leads as CSV string.
 */
export function exportToCSV(leads) {
  const headers = ['Name', 'Company', 'Title', 'Email', 'Phone', 'Score', 'Intent', 'Source URL', 'Reason', 'Type'];
  const rows = leads.map(l => [
    csvEscape(l.canonical_name),
    csvEscape(l.company),
    csvEscape(l.title),
    csvEscape(l.emails?.join('; ') || ''),
    csvEscape(l.phones?.join('; ') || ''),
    l.score,
    l.intent_score,
    csvEscape(l.source_url),
    csvEscape(l.reason),
    csvEscape(l.lead_type),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Purge leads older than N days.
 */
export async function purgeOlderThan(db, days) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.collection('harvested_leads').deleteMany({
    created_at: { $lt: cutoff },
  });
  return result.deletedCount;
}

/**
 * Create or update a harvest job record.
 */
export async function createJob(db, { userId, query, mode, config }) {
  const job = {
    user_id: userId,
    query,
    mode,
    config,
    status: 'running',
    lead_count: 0,
    pages_crawled: 0,
    urls_discovered: 0,
    duplicates_filtered: 0,
    ai_tokens: { input: 0, output: 0 },
    ai_cost: 0,
    started_at: new Date(),
    completed_at: null,
    error: null,
  };
  const result = await db.collection('harvest_jobs').insertOne(job);
  return { ...job, _id: result.insertedId };
}

/**
 * Update job progress.
 */
export async function updateJob(db, jobId, updates) {
  await db.collection('harvest_jobs').updateOne(
    { _id: jobId },
    { $set: { ...updates, updated_at: new Date() } }
  );
}

/**
 * Complete a job.
 */
export async function completeJob(db, jobId, summary) {
  await db.collection('harvest_jobs').updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'completed',
        completed_at: new Date(),
        ...summary,
      },
    }
  );
}
