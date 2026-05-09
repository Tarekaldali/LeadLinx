/**
 * LeadHarvester — Lead Scorer
 * Deterministic scoring combining multiple signals into a 0-100 score.
 */

/**
 * Score a lead based on all available signals.
 * @param {Object} params
 * @param {Array} params.candidates - Detected candidates for this lead
 * @param {Object} params.classification - LLM classification result (if any)
 * @param {Object} params.pageMeta - Page metadata
 * @param {boolean} params.enriched - Whether enrichment was successful
 * @param {string} params.query - Original search query for relevance matching
 * @returns {{ score: number, breakdown: Object, tier: string }}
 */
export function scoreLead({ candidates = [], classification = null, pageMeta = {}, enriched = false, query = '' }) {
  const breakdown = {
    email: 0,
    phone: 0,
    cta: 0,
    intent: 0,
    relevance: 0,
    enrichment: 0,
  };

  // ── 1. Email signal (+25 max) ─────────────────────────────────
  const emails = candidates.filter(c => c.type === 'email');
  if (emails.length > 0) {
    // Business emails are worth more than personal
    const hasBizEmail = emails.some(e =>
      !e.value.includes('@gmail.') &&
      !e.value.includes('@yahoo.') &&
      !e.value.includes('@hotmail.') &&
      !e.value.includes('@outlook.')
    );
    breakdown.email = hasBizEmail ? 25 : 15;
  }

  // ── 2. Phone signal (+15 max) ──────────────────────────────────
  const phones = candidates.filter(c => c.type === 'phone');
  if (phones.length > 0) {
    // Direct lines (from tel: links) are worth more
    const hasDirectLine = phones.some(p => p.confidence >= 0.9);
    breakdown.phone = hasDirectLine ? 15 : 10;
  }

  // ── 3. CTA / Contact Form signal (+20 max) ────────────────────
  const ctas = candidates.filter(c => c.type === 'cta' || c.type === 'contact_form');
  if (ctas.length > 0) {
    breakdown.cta = Math.min(20, ctas.length * 8);
  }

  // ── 4. LLM Intent Score (+30 max) ─────────────────────────────
  if (classification?.intent_score) {
    breakdown.intent = Math.round(classification.intent_score * 30);
  } else if (classification === null) {
    // No AI classification used — give moderate base score for heuristic-only mode
    breakdown.intent = emails.length > 0 ? 15 : 5;
  }

  // ── 5. Query Relevance (+10 max) ──────────────────────────────
  if (query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const pageText = [
      pageMeta.pageTitle, pageMeta.siteName, pageMeta.description,
    ].filter(Boolean).join(' ').toLowerCase();

    const matchCount = queryWords.filter(w => pageText.includes(w)).length;
    const matchRatio = queryWords.length > 0 ? matchCount / queryWords.length : 0;
    breakdown.relevance = Math.round(matchRatio * 10);
  }

  // ── 6. Enrichment bonus (+10) ──────────────────────────────────
  if (enriched) {
    breakdown.enrichment = 10;
  }

  // ── Final Score (clamped 0-100) ────────────────────────────────
  const score = Math.max(0, Math.min(100,
    breakdown.email + breakdown.phone + breakdown.cta +
    breakdown.intent + breakdown.relevance + breakdown.enrichment
  ));

  // ── Tier Classification ────────────────────────────────────────
  let tier = 'cold';
  if (score >= 80) tier = 'hot';
  else if (score >= 60) tier = 'warm';
  else if (score >= 40) tier = 'mild';

  return { score, breakdown, tier };
}

/**
 * Convert a 0-100 score to the 0-10 scale the UI expects.
 */
export function toIntentScore10(score100) {
  return Math.round(score100 / 10);
}
