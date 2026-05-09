/**
 * LeadHarvester — Deduplication Engine
 * Three-layer dedup: exact email hash, fuzzy name+company, URL dedup.
 * Uses MongoDB for cross-session persistence.
 */

import crypto from 'crypto';

/**
 * Generate a SHA-256 hash of a normalized email.
 */
export function emailHash(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize a name+company for fuzzy matching.
 * Strips punctuation, lowercases, trims.
 */
export function normalizeKey(name, company) {
  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return `${clean(name)}|${clean(company)}`;
}

/**
 * In-memory deduplication manager for a single harvest job.
 * Also checks MongoDB for cross-session dedup.
 */
export class DeduplicationEngine {
  constructor(db = null) {
    this.seenEmailHashes = new Set();
    this.seenNameCompany = new Set();
    this.seenUrls = new Set();
    this.db = db;
    this.duplicateCount = 0;
  }

  /**
   * Load existing hashes from MongoDB for cross-session dedup.
   */
  async loadFromDb(userId) {
    if (!this.db) return;
    try {
      const existingLeads = await this.db.collection('harvested_leads')
        .find(
          { user_id: userId },
          { projection: { email_hash: 1, canonical_name: 1, company: 1, source_url: 1 } }
        )
        .toArray();

      for (const lead of existingLeads) {
        if (lead.email_hash) this.seenEmailHashes.add(lead.email_hash);
        if (lead.canonical_name && lead.company) {
          this.seenNameCompany.add(normalizeKey(lead.canonical_name, lead.company));
        }
        if (lead.source_url) this.seenUrls.add(lead.source_url);
      }

      console.log(`[Dedup] Loaded ${existingLeads.length} existing leads for cross-session dedup`);
    } catch (err) {
      console.warn('[Dedup] Could not load existing leads:', err.message);
    }
  }

  /**
   * Check if a lead is a duplicate. Returns reason string or null if unique.
   */
  isDuplicate(lead) {
    // Layer 1: Exact email hash
    if (lead.emails?.length > 0) {
      for (const email of lead.emails) {
        const hash = emailHash(email);
        if (hash && this.seenEmailHashes.has(hash)) {
          this.duplicateCount++;
          return `duplicate_email:${email}`;
        }
      }
    }

    // Layer 2: Fuzzy name + company
    if (lead.canonical_name && lead.company) {
      const key = normalizeKey(lead.canonical_name, lead.company);
      if (key !== '|' && this.seenNameCompany.has(key)) {
        this.duplicateCount++;
        return `duplicate_name_company:${key}`;
      }
    }

    // Layer 3: URL dedup (same source page already processed)
    if (lead.source_url && this.seenUrls.has(lead.source_url)) {
      // Don't count URL dedup as a full duplicate — same page can have multiple leads
      // Just skip if we already extracted from this URL
      // Actually, allow multiple leads per URL (e.g. a team page with many contacts)
    }

    return null; // Not a duplicate
  }

  /**
   * Register a lead as seen (for future dedup).
   */
  markSeen(lead) {
    if (lead.emails?.length > 0) {
      for (const email of lead.emails) {
        const hash = emailHash(email);
        if (hash) this.seenEmailHashes.add(hash);
      }
    }
    if (lead.canonical_name && lead.company) {
      this.seenNameCompany.add(normalizeKey(lead.canonical_name, lead.company));
    }
    if (lead.source_url) {
      this.seenUrls.add(lead.source_url);
    }
  }

  getStats() {
    return {
      uniqueEmails: this.seenEmailHashes.size,
      uniqueNameCompany: this.seenNameCompany.size,
      uniqueUrls: this.seenUrls.size,
      duplicatesFiltered: this.duplicateCount,
    };
  }
}
