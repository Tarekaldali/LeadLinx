/**
 * LeadHarvester — Main Orchestrator
 * Wires: crawl → detect → classify → dedup → score → enrich → store → export
 *
 * This is the primary entry point for lead extraction jobs.
 * Modes: heuristics (fast/free), llm (AI-powered), vision (stub)
 */

import { discoverAndCrawl } from './lead-crawler.js';
import { detectLeads } from './lead-detector.js';
import { classifyCandidate } from './lead-classifier.js';
import { scoreLead, toIntentScore10 } from './lead-scorer.js';
import { DeduplicationEngine, emailHash } from './lead-dedup.js';
import { enrichLead } from './lead-enricher.js';
import { insertLead, ensureIndexes, createJob, updateJob, completeJob } from './lead-store.js';
import { syncLeads } from './crm-sync.js';

/**
 * Run a full lead extraction job.
 *
 * @param {Object} params
 * @param {string} params.query - Natural language search query
 * @param {string} params.mode - 'heuristics' | 'llm' | 'vision'
 * @param {Object} params.db - MongoDB database instance
 * @param {Object} params.userId - User ObjectId
 * @param {Object} params.options - { depth, maxPages, maxUrls, noEnrich, dryRun, syncCrm }
 * @param {Function} params.onProgress - Optional progress callback
 * @returns {Object} Job result with leads, stats, and metadata
 */
export async function runHarvestJob({
  query,
  mode = 'heuristics',
  db,
  userId,
  options = {},
  onProgress = null,
}) {
  const config = {
    depth: options.depth ?? 1,
    maxPages: options.maxPages ?? 12,
    maxUrls: options.maxUrls ?? 6,
    noEnrich: options.noEnrich ?? false,
    dryRun: options.dryRun ?? false,
    syncCrm: options.syncCrm ?? false,
    minScore: options.minScore ?? 50,
    // Raise default quality threshold to prefer higher-intent leads
    // Users can still override via options.minScore
  };

  console.log(`\n🚀 [Harvester] Starting job: "${query}" | Mode: ${mode}`);
  console.log(`[Harvester] Config:`, config);

  // ── Step 0: Initialize ────────────────────────────────────────
  await ensureIndexes(db);

  const job = await createJob(db, { userId, query, mode, config });
  const jobId = job._id;

  const dedup = new DeduplicationEngine(db);
  await dedup.loadFromDb(userId);

  const stats = {
    urlsDiscovered: 0,
    pagesCrawled: 0,
    candidatesDetected: 0,
    candidatesClassified: 0,
    leadsStored: 0,
    duplicatesFiltered: 0,
    aiTokensIn: 0,
    aiTokensOut: 0,
    aiCost: 0,
  };

  const allLeads = [];

  try {
    // ── Step 1: Discover + Crawl ──────────────────────────────────
    const progress = (msg) => {
      console.log(`[Harvester] ${msg}`);
      onProgress?.(msg);
    };

    progress('🔍 Discovering target URLs...');

    const { pages, discoveredUrls } = await discoverAndCrawl(query, {
      depth: config.depth,
      maxPages: config.maxPages,
      maxUrls: config.maxUrls,
      onPage: (page) => {
        stats.pagesCrawled++;
        progress(`📄 Crawled [${stats.pagesCrawled}/${config.maxPages}]: ${page.url}`);
      },
    });

    stats.urlsDiscovered = discoveredUrls.length;
    await updateJob(db, jobId, {
      urls_discovered: stats.urlsDiscovered,
      pages_crawled: stats.pagesCrawled,
    });

    // ── Step 2: Detect leads on each page ─────────────────────────
    progress('🔬 Detecting contact signals...');
    const allCandidates = [];

    for (const page of pages) {
      const { candidates, meta } = detectLeads(page.html, page.url);
      stats.candidatesDetected += candidates.length;

      for (const candidate of candidates) {
        allCandidates.push({ ...candidate, pageMeta: meta });
      }
    }

    progress(`📊 Found ${allCandidates.length} contact signals across ${pages.length} pages`);

    if (allCandidates.length === 0) {
      await completeJob(db, jobId, {
        lead_count: 0,
        ...stats,
        status: 'completed',
      });
      return { leads: [], stats, jobId, query };
    }

    // ── Step 3: Group candidates by source URL → build lead objects ─
    const leadsByUrl = {};
    for (const c of allCandidates) {
      const url = c.sourceUrl || 'unknown';
      if (!leadsByUrl[url]) {
        leadsByUrl[url] = {
          emails: [],
          phones: [],
          ctas: [],
          forms: [],
          socials: {},
          candidates: [],
          pageMeta: c.pageMeta || {},
        };
      }
      const group = leadsByUrl[url];
      group.candidates.push(c);

      switch (c.type) {
        case 'email': group.emails.push(c.value); break;
        case 'phone': group.phones.push(c.value); break;
        case 'cta': group.ctas.push(c); break;
        case 'contact_form': group.forms.push(c); break;
        case 'social':
          group.socials[c.platform] = c.value;
          break;
      }
    }

    // ── Step 4: Classify + Score + Dedup + Store ──────────────────
    progress('🧠 Scoring and deduplicating leads...');

    for (const [sourceUrl, group] of Object.entries(leadsByUrl)) {
      // Skip pages with no useful contact info
      if (group.emails.length === 0 && group.phones.length === 0 && group.ctas.length === 0) {
        continue;
      }

      // Optional: LLM classification for mode=llm
      let classification = null;
      if (mode === 'llm' && group.candidates.length > 0) {
        const primaryCandidate = group.candidates.find(c => c.type === 'email') || group.candidates[0];
        classification = await classifyCandidate(primaryCandidate, group.pageMeta);

        if (classification.tokens) {
          stats.aiTokensIn += classification.tokens.input;
          stats.aiTokensOut += classification.tokens.output;
          stats.candidatesClassified++;
        }
        if (classification.cost) {
          stats.aiCost += classification.cost.rawCost;
        }
      }

      // Score the lead
      const { score, breakdown, tier } = scoreLead({
        candidates: group.candidates,
        classification,
        pageMeta: group.pageMeta,
        enriched: false,
        query,
      });

      // Skip low-scoring leads
      if (score < config.minScore) continue;

      // Build lead object
      const lead = {
        canonical_name: classification?.entities?.name || group.pageMeta.siteName || '',
        emails: [...new Set(group.emails)],
        phones: [...new Set(group.phones)],
        company: classification?.entities?.company || group.pageMeta.siteName || '',
        title: classification?.entities?.title || '',
        source_url: sourceUrl,
        score,
        score_breakdown: breakdown,
        intent_score: classification?.intent_score || (score / 100),
        lead_type: classification?.lead_type || 'Direct-Contact',
        reason: classification?.reason || `Contact info found: ${group.emails.length} emails, ${group.phones.length} phones`,
        suggested_reply: classification?.suggested_reply || '',
        social_profiles: group.socials,
        page_title: group.pageMeta.pageTitle || '',
        site_name: group.pageMeta.siteName || '',
        job_id: jobId.toString(),
        user_id: userId,
      };

      // Dedup check
      const dupReason = dedup.isDuplicate(lead);
      if (dupReason) {
        stats.duplicatesFiltered++;
        continue;
      }
      dedup.markSeen(lead);

      // Enrich (unless --no-enrich)
      const finalLead = config.noEnrich ? lead : await enrichLead(lead);

      // Re-score with enrichment bonus
      if (finalLead.enriched) {
        const rescored = scoreLead({
          candidates: group.candidates,
          classification,
          pageMeta: group.pageMeta,
          enriched: true,
          query,
        });
        finalLead.score = rescored.score;
        finalLead.score_breakdown = rescored.breakdown;
      }

      // Store (unless --dry-run)
      if (!config.dryRun) {
        const stored = await insertLead(db, finalLead);
        if (stored) stats.leadsStored++;
      }

      allLeads.push(finalLead);
    }

    // ── Step 5: CRM Sync (optional) ──────────────────────────────
    if (config.syncCrm && allLeads.length > 0 && !config.dryRun) {
      progress('📤 Syncing to CRM...');
      await syncLeads(allLeads);
    }

    // ── Step 6: Finalize ─────────────────────────────────────────
    const dedupStats = dedup.getStats();
    stats.duplicatesFiltered = dedupStats.duplicatesFiltered;

    await completeJob(db, jobId, {
      lead_count: allLeads.length,
      pages_crawled: stats.pagesCrawled,
      urls_discovered: stats.urlsDiscovered,
      duplicates_filtered: stats.duplicatesFiltered,
      ai_tokens: { input: stats.aiTokensIn, output: stats.aiTokensOut },
      ai_cost: stats.aiCost,
    });

    progress(`✅ Job complete: ${allLeads.length} leads from ${stats.pagesCrawled} pages`);

  } catch (error) {
    console.error('[Harvester] Job failed:', error);
    await updateJob(db, jobId, { status: 'failed', error: error.message });
    throw error;
  }

  // Sort by score descending
  allLeads.sort((a, b) => b.score - a.score);

  return {
    leads: allLeads,
    stats,
    jobId: jobId.toString(),
    query,
    mode,
  };
}

/**
 * Convert harvester leads to the format the existing ChatMessage component expects.
 * This bridges the new harvester output with the legacy UI.
 */
export function formatLeadsForUI(harvestResult) {
  return harvestResult.leads.map((lead, index) => ({
    id: lead._id?.toString() || `harvest-${index}`,
    // ChatMessage expects these Reddit-style fields
    subreddit: lead.company || lead.site_name || 'web',
    author: lead.canonical_name || lead.emails?.[0] || 'unknown',
    title: lead.page_title || lead.company || `Lead from ${lead.source_url}`,
    link: lead.source_url,
    text: [
      lead.emails?.length > 0 ? `📧 ${lead.emails.join(', ')}` : '',
      lead.phones?.length > 0 ? `📞 ${lead.phones.join(', ')}` : '',
      lead.company ? `🏢 ${lead.company}` : '',
      lead.title ? `💼 ${lead.title}` : '',
    ].filter(Boolean).join(' | '),
    // Scoring
    intentScore: toIntentScore10(lead.score),
    reasoning: lead.reason,
    suggestedReply: lead.suggested_reply || `Reach out to ${lead.canonical_name || 'this contact'} about their ${lead.company ? lead.company + ' ' : ''}needs.`,
    leadType: lead.lead_type || 'Direct-Contact',
    urgency: lead.score >= 80 ? 'high' : lead.score >= 50 ? 'medium' : 'low',
    badge: lead.score >= 80 ? 'hot' : lead.score >= 50 ? 'warm' : 'opportunity',
    // Extra data for the new UI
    email: lead.emails?.[0] || '',
    phone: lead.phones?.[0] || '',
    company: lead.company,
    jobTitle: lead.title,
    score: lead.score,
    enriched: lead.enriched,
    scoredBy: `Harvester-${lead.job_id ? 'V1' : 'Unknown'}`,
  }));
}
