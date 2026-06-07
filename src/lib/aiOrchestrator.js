/**
 * LeadLinx V2 AI Orchestrator
 * Featuring: Smart Rate Limit Handling & Auto-Retries
 * EXCLUSIVELY using OpenRouter for all operations.
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Low-cost vs high-cost model selection
const CHEAP_MODEL = process.env.CHEAP_AI_MODEL || 'mistralai/mistral-7b-instruct:free';
const EXPENSIVE_MODEL = process.env.EXPENSIVE_AI_MODEL || 'google/gemini-2.0-flash-001';
const MAX_LOCAL_SUMMARY_CHARS = process.env.AI_SUMMARY_CHARS ? parseInt(process.env.AI_SUMMARY_CHARS, 10) : 300;

// Local heuristic to reduce LLM usage: require a minimal localScore to send a post to the LLM
const LOCAL_SCORE_THRESHOLD = parseInt(process.env.AI_LOCAL_SCORE_THRESHOLD || '8', 10);

/**
 * Robust JSON Extractor
 * @param {string} text - Raw AI response
 * @param {'array' | 'object'} expectedType - Desired return type
 */
function extractAndParseJSON(text, expectedType = 'array') {
  const defaultVal = expectedType === 'array' ? [] : { subreddits: [], search_queries: [] };
  
  try {
    if (!text) return defaultVal;

    // Remove markdown code blocks
    const cleanedText = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
    
    // Attempt direct parse first
    try {
      const direct = JSON.parse(cleanedText);
      if (expectedType === 'object' && Array.isArray(direct)) {
        // If AI returned an array of objects like [{"search_queries": [...], "subreddits": [...]}]
        // we flatten them into a single plan object.
        const merged = { subreddits: [], search_queries: [] };
        direct.forEach(item => {
          if (typeof item === 'string') merged.search_queries.push(item);
          else {
            if (Array.isArray(item.subreddits)) merged.subreddits.push(...item.subreddits);
            if (Array.isArray(item.search_queries)) merged.search_queries.push(...item.search_queries);
            if (item.search_query) merged.search_queries.push(item.search_query);
          }
        });
        return merged;
      }
      return direct;
    } catch (e) {
      // Fallback to substring extraction
      const startChar = expectedType === 'array' ? '[' : '{';
      const endChar = expectedType === 'array' ? ']' : '}';
      const startIndex = cleanedText.indexOf(startChar);
      const endIndex = cleanedText.lastIndexOf(endChar);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = cleanedText.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonStr);
      }
      throw e;
    }
  } catch (error) {
    console.error(`❌ JSON Parse Failed (${expectedType}). Raw snippet:`, text?.substring(0, 100));
    return defaultVal; 
  }
}

/**
 * NEW: Intent Gatekeeper
 * Classifies if the user wants to CHAT or perform a lead SEARCH.
 */
export async function classifyIntent(query) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        // Use low-cost model for intent classification by default
        model: CHEAP_MODEL,
        messages: [
          {
            role: "system",
            content: `You are the LeadLinx Intent Classifier. Determine if the user wants to perform a lead search or just talk.
            
            - SEARCH: User describes a SPECIFIC product, a niche, or an industry (e.g. "find leads for my CRM for plumbers").
            - CHAT: Greetings, general questions, small talk, OR overly generic requests like "find leads" or "get customers" without specifying a niche.
            
            If the request is too generic to perform a search, classify as CHAT and set response_message to ask the user for their niche or target audience.
            
            Return ONLY JSON: {"intent": "SEARCH" | "CHAT", "response_message": "A friendly reply if CHAT, otherwise empty string"}`
          },
          { role: "user", content: query }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = extractAndParseJSON(content, 'object');
    return { data: parsed, usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 } };
  } catch (error) {
    console.error("⚠️ Intent Classification Error:", error);
    return { data: { intent: "SEARCH", response_message: "" }, usage: { prompt_tokens: 0, completion_tokens: 0 } };
  }
}

/**
 * PHASE 1: Strategic Search Planning
 * Reverse-engineers product description into high-converting Boolean queries.
 */
export async function generateSearchPlan(query) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        // Generate the search plan using the cheaper model first to save tokens
        model: CHEAP_MODEL,
        messages: [
          { 
            role: "system",
            content: `You are the "LeadLinx Search Architect," an elite growth hacker and social listening expert.
            Your sole purpose is to reverse-engineer a user's product/service into high-converting Reddit search queries.
            
            STRATEGIC PILLARS:
            1. COMPETITOR INTERCEPTION: Users complaining about a competitor (e.g., "competitor sucks", "alternative to").
            2. PAIN-POINT MINING: Users describing the exact problem (e.g., "tired of...", "why is [X] so expensive").
            3. SOLUTION SEEKING: Users explicitly asking for recommendations (e.g., "recommend", "looking for a tool").
            
            RULES:
            - DO NOT use complex Boolean logic (no AND/OR or nested parentheses). Reddit's API breaks with complex boolean queries.
            - Use natural, exact-match phrases wrapped in quotes (e.g., "alternative to", "tired of", "looking for").
            - Return ONLY JSON.
            - Return 6 to 8 search_queries mixing exact buyer phrases, problem phrases, and recommendation phrases.
            - Include plain-language phrases Reddit users actually type; avoid overly narrow jargon.
            - Up to 30 high-intent subreddits.`
          },
          { role: "user", content: `Product/Leads Wanted: "${query}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const plan = extractAndParseJSON(content, 'object');
    
    return {
      subreddits: Array.isArray(plan?.subreddits) ? plan.subreddits : [],
      search_queries: Array.isArray(plan?.search_queries) ? plan.search_queries : [query],
      usage: data.usage
    };
  } catch (error) {
    console.error("⚠️ Search Plan Error:", error);
    return { subreddits: [], search_queries: [query] };
  }
}

/**
 * PHASE 2: Lead Scorer Orchestration
 */
export async function analyzeLeadsBatch(batch, userQuery, opts = {}) {
  // opts: { plan: 'free'|'plus'|'pro'|'enterprise', maxChars }
  const plan = opts.plan || 'free';
  const maxChars = opts.maxChars || MAX_LOCAL_SUMMARY_CHARS;

  // Prefer cheap models for lower-tier plans; pro/enterprise can use expensive model
  const primaryModel = (plan === 'pro' || plan === 'enterprise') ? EXPENSIVE_MODEL : CHEAP_MODEL;

  // Heuristic gating: if posts have localScore, prefer high-scoring ones to reduce LLM calls
  let candidates = batch;
  const hasLocalScores = batch.some(p => typeof p.localScore === 'number');
  if (hasLocalScores) {
    const high = batch.filter(p => (p.localScore || 0) >= LOCAL_SCORE_THRESHOLD).slice(0, 6);
    if (high.length > 0) candidates = high;
    else candidates = batch.sort((a, b) => (b.localScore || 0) - (a.localScore || 0)).slice(0, Math.min(2, batch.length));
  }

  try {
    // First attempt with primary (cheap) model
    const cheapRes = await callOpenRouterAnalysis(primaryModel, candidates, userQuery, { maxChars });
    if (cheapRes && Array.isArray(cheapRes.leads) && cheapRes.leads.length > 0) {
      return cheapRes;
    }

    // If cheap model returned nothing and plan allows escalation, try expensive model on the original batch
    if (primaryModel !== EXPENSIVE_MODEL) {
      try {
        const escRes = await callOpenRouterAnalysis(EXPENSIVE_MODEL, batch, userQuery, { maxChars: Math.max(800, maxChars * 2) });
        return escRes;
      } catch (escErr) {
        console.warn('⚠️ Escalation to expensive model failed:', escErr.message);
        return { leads: [], usage: cheapRes?.usage || null, model: cheapRes?.model || primaryModel };
      }
    }

    return { leads: [], usage: cheapRes?.usage || null, model: cheapRes?.model || primaryModel };
  } catch (error) {
    console.error('❌ analyzeLeadsBatch failed:', error.message);
    return { leads: [], usage: null };
  }
}

/**
 * Helper: Call OpenRouter for Analysis
 */
async function callOpenRouterAnalysis(model, batch, userQuery, options = {}, retries = 2) {
  const maxChars = options.maxChars || MAX_LOCAL_SUMMARY_CHARS;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Build a compact summary payload to reduce token usage
      const summary = batch.map(p => ({ id: p.postId || p.id || p.postId, title: p.title, text: (p.text || '').substring(0, maxChars) }));

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: `You are the "LeadLinx Ruthless Scorer," a strict qualification engine.\nAnalyze Reddit posts for "Buyer Intent" based on the user's goal: "${userQuery}".`
            },
            {
              role: "user",
              content: `Analyze these posts:\n${JSON.stringify(summary)}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 && attempt < retries) {
          await sleep(5000); continue;
        }
        throw new Error(data.error.message || "OpenRouter Failed");
      }

      const content = data.choices?.[0]?.message?.content;
      const parsed = extractAndParseJSON(content, 'object');
      
      return {
        leads: Array.isArray(parsed?.leads) ? parsed.leads : [],
        usage: data.usage,
        model: data.model || model
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(2000);
    }
  }
}
