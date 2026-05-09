/**
 * LeadHarvester — LLM Classifier
 * AI-driven lead classification using OpenRouter (existing integration).
 * Temperature=0 for deterministic output, JSON-only response.
 */

import { callGemini, calcCost } from '../gemini.js';

// ── Deterministic Prompt Template ─────────────────────────────────
const CLASSIFIER_PROMPT = `You are an elite B2B lead qualification analyst. You are given a webpage excerpt and detected contact signals from that page.

Your job: determine if this represents a REAL business lead opportunity — a company or person who could be a potential customer.

ANALYSIS CRITERIA:
1. REAL BUSINESS: Is this a real company with actual contact info (not a blog post, directory listing, or spam)?
2. DECISION MAKER SIGNALS: Does the page suggest access to decision makers (C-suite, VP, Director titles)?
3. BUYING INTENT: Are there signals of active purchasing (budget mentions, RFP, seeking vendors, project timelines)?
4. CONTACT QUALITY: Are the emails/phones direct business contacts (not generic info@ or support@)?

SCORING GUIDE:
- 0.0-0.3: Not a lead (spam, irrelevant, personal blog, dead page)
- 0.3-0.5: Weak lead (generic business page, no clear decision maker)
- 0.5-0.7: Moderate lead (real business, some contact info, unclear intent)
- 0.7-0.9: Strong lead (verified business, direct contacts, some buying signals)
- 0.9-1.0: Hot lead (decision maker contact, explicit buying intent, budget signals)

Return ONLY valid JSON — no markdown, no explanation, no code blocks:
{"is_lead":true,"intent_score":0.75,"entities":{"name":"","company":"","title":"","emails":[],"phones":[]},"lead_type":"Pain-Point","reason":"concise rationale max 20 words","suggested_reply":"suggested outreach hook max 25 words"}

lead_type must be one of: "Pain-Point", "Competitor-Frustration", "Solution-Seeking", "Direct-Contact", "Decision-Maker"`;

// ── Rate Limiting ─────────────────────────────────────────────────
let activeRequests = 0;
const MAX_CONCURRENT = 5;
const queue = [];

function processQueue() {
  while (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const { resolve, fn } = queue.shift();
    activeRequests++;
    fn().then(resolve).finally(() => {
      activeRequests--;
      processQueue();
    });
  }
}

function rateLimited(fn) {
  return new Promise(resolve => {
    queue.push({ resolve, fn });
    processQueue();
  });
}

/**
 * Classify a single lead candidate using LLM.
 * @param {Object} candidate - { type, value, context, sourceUrl }
 * @param {Object} pageMeta - { pageTitle, siteName, description }
 * @returns {Object} Classification result
 */
export async function classifyCandidate(candidate, pageMeta = {}) {
  return rateLimited(async () => {
    try {
      const excerpt = buildExcerpt(candidate, pageMeta);

      const messages = [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: excerpt },
      ];

      const res = await callGemini(messages, {
        temperature: 0,
        responseFormat: 'json',
      });

      const parsed = safeParseJSON(res.text);
      const cost = calcCost(res.inputTokens, res.outputTokens);

      return {
        ...parsed,
        tokens: { input: res.inputTokens, output: res.outputTokens },
        cost,
        classified: true,
      };
    } catch (error) {
      console.error('[LeadClassifier] Error:', error.message);
      return safeDefault();
    }
  });
}

/**
 * Batch classify multiple candidates.
 * Groups candidates by source URL to reduce API calls.
 */
export async function classifyBatch(candidates, pageMeta = {}) {
  if (!candidates.length) return [];

  // Group by source URL for efficiency
  const grouped = {};
  for (const c of candidates) {
    const key = c.sourceUrl || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const results = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (const [url, group] of Object.entries(grouped)) {
    // Send all candidates from the same page in one request
    const excerpt = group.map(c => buildExcerpt(c, pageMeta)).join('\n---\n');

    try {
      const messages = [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: `Analyze these ${group.length} contact signals from ${url}:\n\n${excerpt}` },
      ];

      const res = await rateLimited(() =>
        callGemini(messages, { temperature: 0, responseFormat: 'json' })
      );

      totalTokensIn += res.inputTokens;
      totalTokensOut += res.outputTokens;

      const parsed = safeParseJSON(res.text);
      // AI might return a single object or an array
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (let i = 0; i < group.length; i++) {
        results.push({
          candidate: group[i],
          classification: items[i] || items[0] || safeDefault(),
        });
      }
    } catch (error) {
      console.error('[LeadClassifier] Batch error for', url, ':', error.message);
      for (const c of group) {
        results.push({ candidate: c, classification: safeDefault() });
      }
    }
  }

  return {
    results,
    totalTokens: { input: totalTokensIn, output: totalTokensOut },
    cost: calcCost(totalTokensIn, totalTokensOut),
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function buildExcerpt(candidate, meta) {
  return [
    `Page: ${meta.pageTitle || meta.siteName || 'Unknown'}`,
    meta.description ? `Description: ${meta.description.slice(0, 200)}` : '',
    `Signal Type: ${candidate.type}`,
    `Signal Value: ${candidate.value}`,
    `Context: ${candidate.context?.slice(0, 300) || 'No context'}`,
    `Source URL: ${candidate.sourceUrl || 'Unknown'}`,
  ].filter(Boolean).join('\n');
}

function safeParseJSON(text) {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON from the text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fall through */ }
    }
    return safeDefault();
  }
}

function safeDefault() {
  return {
    is_lead: false,
    intent_score: 0,
    entities: { name: '', company: '', title: '', emails: [], phones: [] },
    lead_type: 'Direct-Contact',
    reason: 'Classification failed — defaulting to safe negative',
    suggested_reply: '',
    classified: false,
  };
}
