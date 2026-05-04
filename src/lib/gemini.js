const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

// ─── Gemini pricing (USD per 1M tokens) ──────────────────────────────────────
// gemini-2.0-flash: $0.10 input / $0.40 output (as of 2025)
const PRICING = {
  'gemini-2.0-flash':      { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
};

// Profit margin multiplier on top of raw API cost
const PROFIT_MARGIN = 3.5; // 3.5× cost = ~71% margin

/**
 * Estimate USD cost from token counts.
 * Returns { inputCost, outputCost, totalCost, creditsToCharge }
 * creditsToCharge = (totalCost × PROFIT_MARGIN) mapped to credits
 * 1 credit = $0.001 (0.1 cent)
 */
export function calcCost(inputTokens, outputTokens, model = 'gemini-2.0-flash') {
  const p = PRICING[model] || PRICING['gemini-2.0-flash'];
  const inputCost  = (inputTokens  / 1_000_000) * p.input;
  const outputCost = (outputTokens / 1_000_000) * p.output;
  const rawCost    = inputCost + outputCost;
  const totalCost  = rawCost * PROFIT_MARGIN;
  // 1 credit = $0.001 → charge ceil(totalCost / 0.001) credits, min 1
  const creditsToCharge = Math.max(1, Math.ceil(totalCost / 0.001));
  return { inputCost, outputCost, rawCost, totalCost, creditsToCharge, inputTokens, outputTokens };
}

// Core Gemini API call — returns { text, inputTokens, outputTokens, model }
async function callGemini(messages, options = {}) {
  let systemInstruction = null;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxTokens || 4000,
    },
  };
  if (systemInstruction) requestBody.systemInstruction = systemInstruction;
  if (options.responseFormat === 'json') {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const models = options.model ? [options.model] : MODELS;
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429) {
          const waitMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const errMsg = err?.error?.message || err?.error?.status || JSON.stringify(err);
          console.error(`Gemini API ${response.status} on ${model} attempt ${attempt + 1}: ${errMsg}`);
          lastError = new Error(`Gemini ${response.status}: ${errMsg}`);
          // Don't retry on non-429 errors (quota, invalid key, etc.)
          if (response.status !== 429 && response.status !== 503) break;
          break;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const inputTokens  = data.usageMetadata?.promptTokenCount     || estimateTokens(messages);
        const outputTokens = data.usageMetadata?.candidatesTokenCount  || estimateTokens([{ content: text }]);
        return { text, inputTokens, outputTokens, model };
      } catch (err) {
        lastError = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('All Gemini API attempts failed');
}

// Rough token estimator (1 token ≈ 4 chars)
function estimateTokens(messages) {
  const total = messages.map(m => (m.content || m.text || '')).join(' ');
  return Math.ceil(total.length / 4);
}

/**
 * Keyword-based fallback scorer — used when Gemini API is unavailable.
 * Scores posts using buyer-intent signals in title/text.
 */
function keywordFallbackScore(post, userQuery = '') {
  const text = `${post.title} ${post.text || ''}`.toLowerCase();
  const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Buyer-intent keyword lists
  const BUYER_SIGNALS = [
    'looking for', 'recommend', 'alternative', 'best tool', 'which tool',
    'struggling with', 'frustrated', 'switching from', 'migrating', 'comparing',
    'need help', 'help me find', 'advice on', 'suggestion', 'looking to buy',
    'worth it', 'is it worth', 'how much does', 'pricing', 'plans',
    'tried everything', 'nothing works', 'fed up', 'disappointed',
    'want to', 'trying to find', 'anyone use', 'anyone tried', 'does anyone know',
    'can anyone recommend', 'budget', 'affordable', 'cheap', 'expensive',
    'monthly', 'subscription', 'upgrade', 'cancel', 'free trial',
  ];
  const DISQUALIFIERS = [
    'tutorial', 'how to code', 'i built', 'my project', 'i made',
    'showoff', 'showcase', 'feedback on my', 'just released', 'open source',
  ];

  let score = 5; // baseline
  let matchedSignals = [];

  // Strong boost for query-word matches
  const queryMatches = queryWords.filter(w => text.includes(w)).length;
  score += Math.min(queryMatches * 0.5, 2);

  // Check buyer signals
  for (const signal of BUYER_SIGNALS) {
    if (text.includes(signal)) {
      score += 0.5;
      matchedSignals.push(signal);
    }
  }

  // Penalize disqualifiers
  for (const dq of DISQUALIFIERS) {
    if (text.includes(dq)) score -= 1.5;
  }

  // Boost for high engagement (real pain points get upvoted)
  if (post.score > 100) score += 0.5;
  if (post.numComments > 20) score += 0.5;

  // Determine final score (cap at 8 since this is heuristic)
  const finalScore = Math.min(8, Math.max(1, Math.round(score)));

  if (finalScore < 7) return null;

  return {
    ...post,
    intentScore: finalScore,
    intentReason: matchedSignals.slice(0, 2).join(', ') || 'Matches buyer search terms',
    urgency: post.score > 200 ? 'high' : 'medium',
    userType: 'other',
    painPoint: post.title.substring(0, 80),
    badge: finalScore >= 8 ? 'hot' : 'opportunity',
    replyAngle: 'Share helpful tool recommendation',
    scoredBy: 'keyword-fallback',
  };
}

/**
 * Score posts in batches.
 * ONLY returns leads with intentScore >= 7 (genuine buyer intent).
 * Falls back to keyword scoring if Gemini API is unavailable.
 * Returns { leads, costInfo }
 */
export async function filterLeadsByIntent(posts, userQuery = '') {
  if (!posts.length) return { leads: [], costInfo: calcCost(0, 0) };

  const BATCH_SIZE = 30;
  const MIN_SCORE = 7;
  const allLeads = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let usedModel = 'gemini-2.0-flash';
  let geminiWorking = true; // track if Gemini is available

  // Process posts in batches
  const postsToScore = posts.slice(0, 150);
  const batches = [];
  for (let i = 0; i < postsToScore.length; i += BATCH_SIZE) {
    batches.push(postsToScore.slice(i, i + BATCH_SIZE));
  }

  console.log(`🔍 Scoring ${postsToScore.length} posts in ${batches.length} batches, min score: ${MIN_SCORE}/10`);

  // Process posts in batches sequentially to avoid rate limits
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    // If Gemini failed on previous batch, use keyword fallback directly
    if (!geminiWorking) {
      console.log(`  Batch ${batchIdx + 1}/${batches.length}: using keyword fallback (Gemini unavailable)`);
      const fallbackLeads = batch.map(p => keywordFallbackScore(p, userQuery)).filter(Boolean);
      allLeads.push(...fallbackLeads);
      continue;
    }

    const postsText = batch.map((p, i) =>
      `[${i}] r/${p.subreddit} | ↑${p.score} | 💬${p.numComments} | "${p.title}" | ${(p.text || '').substring(0, 200)}`
    ).join('\n\n');

    const prompt = `You are a B2B/B2C lead qualifier. Analyze these Reddit posts and find potential buyers.

Context: Looking for leads related to: "${userQuery}"

Score posts 7-10 if the person is:
- Looking for a tool, software, or solution
- Frustrated with their current solution
- Asking for recommendations or comparisons
- A potential buyer (founder, business owner, marketer, freelancer, manager)

Score 1-6 for: news sharing, tutorials, tech discussions without buyer intent, general opinions.

Posts:
${postsText}

Return JSON array with posts scored 7+. Return [] if none qualify.
Fields per item: "index", "score" (7-10), "reason" (10 words max), "urgency" ("medium"|"high"|"critical"), "userType" ("founder"|"business-owner"|"marketer"|"freelancer"|"manager"|"other"), "painPoint" (15 words max), "badge" ("hot" if >=9, else "opportunity"), "replyAngle" (12 words max)

Return ONLY a valid JSON array.`;

    try {
      const { text, inputTokens, outputTokens, model } = await callGemini([
        { role: 'system', content: 'You are a lead scoring expert. Output valid JSON arrays only.' },
        { role: 'user', content: prompt },
      ], { responseFormat: 'json', maxTokens: 3000 });

      totalInputTokens  += inputTokens;
      totalOutputTokens += outputTokens;
      usedModel = model;

      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const results = JSON.parse(cleaned || '[]');

      if (Array.isArray(results)) {
        const batchLeads = results
          .filter(ai => ai.score >= MIN_SCORE)
          .map(ai => {
            const post = batch[ai.index];
            if (!post) return null;
            return {
              ...post,
              intentScore:  Math.min(10, Math.max(7, ai.score || 7)),
              intentReason: ai.reason || 'High buying intent',
              urgency:      ai.urgency || 'medium',
              userType:     ai.userType || 'other',
              painPoint:    ai.painPoint || '',
              badge:        ai.badge || 'opportunity',
              replyAngle:   ai.replyAngle || '',
              batchIndex:   batchIdx,
              scoredBy:     'gemini',
            };
          })
          .filter(Boolean);

        allLeads.push(...batchLeads);
        console.log(`  Batch ${batchIdx + 1}/${batches.length}: ${batchLeads.length} qualified leads found`);
      }

      // Small delay between batches to avoid rate limits
      if (batchIdx < batches.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`Batch ${batchIdx + 1} Gemini failed: ${err.message}`);
      // Switch to keyword fallback for remaining batches
      geminiWorking = false;
      const fallbackLeads = batch.map(p => keywordFallbackScore(p, userQuery)).filter(Boolean);
      allLeads.push(...fallbackLeads);
      console.log(`  Batch ${batchIdx + 1}/${batches.length}: keyword fallback found ${fallbackLeads.length} leads`);
    }
  }

  // Sort by intent score descending
  const sortedLeads = allLeads.sort((a, b) => b.intentScore - a.intentScore);
  const costInfo = calcCost(totalInputTokens, totalOutputTokens, usedModel);

  const method = geminiWorking ? 'Gemini AI' : 'keyword fallback';
  console.log(`💰 Search cost: $${costInfo.rawCost.toFixed(6)} raw | $${costInfo.totalCost.toFixed(6)} with margin | ${costInfo.creditsToCharge} credits`);
  console.log(`🎯 Total qualified leads (score≥${MIN_SCORE}): ${sortedLeads.length} [${method}]`);



  return { leads: sortedLeads, costInfo };
}

/**
 * Generate 3 reply variants: helpful, authority, conversion
 */
export async function generateReply(postTitle, postText, productContext = '') {
  const prompt = `You are writing 3 different Reddit reply variants for this post.

Post Title: ${postTitle}
Post Content: ${(postText || '').substring(0, 500)}
${productContext ? `Product context: ${productContext}` : ''}

Generate exactly 3 replies as a JSON object:

1. "helpful" — empathetic, value-first reply. Give a genuine tip. Under 120 words.
2. "authority" — position yourself as an expert. Share specific insight. Under 120 words.  
3. "conversion" — subtly mention you've seen a tool that helps. Keep it natural, NOT salesy. Under 120 words.

Rules for ALL replies:
- Sound like a real Reddit user, not a bot
- Never say "I highly recommend" or "Check out"
- Start by acknowledging their situation
- Be specific, not generic

Return JSON: {"helpful":"...","authority":"...","conversion":"..."}`;

  try {
    const { text } = await callGemini([
      { role: 'system', content: 'You write authentic Reddit comments in 3 tones. Output valid JSON only.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, responseFormat: 'json' });

    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    return {
      helpful:    result.helpful    || 'Failed to generate reply.',
      authority:  result.authority  || 'Failed to generate reply.',
      conversion: result.conversion || 'Failed to generate reply.',
    };
  } catch (error) {
    console.error('Reply generation failed:', error.message);
    try {
      const { text } = await callGemini([
        { role: 'system', content: 'You write authentic, helpful Reddit comments. Never be salesy.' },
        { role: 'user', content: `Write a helpful reply to this Reddit post:\nTitle: ${postTitle}\nContent: ${(postText || '').substring(0, 300)}\n\nBe genuine, empathetic, under 120 words.` },
      ], { temperature: 0.7 });
      return { helpful: text || 'Please try again.', authority: text || 'Please try again.', conversion: text || 'Please try again.' };
    } catch {
      return { helpful: 'AI temporarily unavailable.', authority: 'AI temporarily unavailable.', conversion: 'AI temporarily unavailable.' };
    }
  }
}

/**
 * Generate market insights from scored leads
 */
export async function generateInsights(leads, userQuery) {
  if (!leads.length) return null;
  const leadsText = leads.slice(0, 8).map(l =>
    `- "${l.title}" (score: ${l.intentScore}, type: ${l.userType}, pain: ${l.painPoint})`
  ).join('\n');

  try {
    const { text } = await callGemini([
      { role: 'system', content: 'You analyze Reddit leads and produce market insights. Output valid JSON only.' },
      { role: 'user', content: `Based on these Reddit leads for query "${userQuery}":\n${leadsText}\n\nReturn JSON:\n- "topPainPoints": 3 short pain points (max 10 words each)\n- "trendingComplaints": 2 common frustrations (max 10 words each)\n- "saasIdeas": 2 potential SaaS ideas from gaps (max 15 words each)\n- "summary": one market insight sentence (max 20 words)` },
    ], { responseFormat: 'json', maxTokens: 600 });

    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

// Legacy export — kept for backwards compat
export async function estimateAICost(tokenCount) {
  return (tokenCount / 1_000_000) * 0.15;
}
