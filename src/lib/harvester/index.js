/**
 * LeadHarvester — Module Index
 * Central export point for all harvester modules.
 */

export { detectLeads, hasContactSignals } from './lead-detector.js';
export { classifyCandidate, classifyBatch } from './lead-classifier.js';
export { scoreLead, toIntentScore10 } from './lead-scorer.js';
export { DeduplicationEngine, emailHash, normalizeKey } from './lead-dedup.js';
export { enrichLead } from './lead-enricher.js';
export { discoverAndCrawl, crawlSite, fetchPage, discoverUrls } from './lead-crawler.js';
export { insertLead, insertLeadsBulk, findByJobId, findByUserId, exportToCSV, exportToJSONL, purgeOlderThan, ensureIndexes, createJob, updateJob, completeJob } from './lead-store.js';
export { syncLeads } from './crm-sync.js';
export { runHarvestJob, formatLeadsForUI } from './lead-extractor.js';
