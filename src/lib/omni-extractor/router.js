/**
 * Omni-Extractor — Dynamic Query Router
 * Analyzes a natural language query and determines the best extraction channels.
 */

import { callGemini } from '../gemini.js';

const ROUTER_PROMPT = `You are the Omni-Extractor Traffic Director for a Lead Generation SaaS.
Your job is to analyze the user's search query and route it to the best data sources.

Determine if the query is:
- B2C (Business to Consumer): e.g., "people looking to buy skincare products", "gamers", "fitness enthusiasts"
- B2B (Business to Business): e.g., "beauty salons", "marketing agencies", "plumbers"

Then select the most effective extraction sources from:
- "social": Reddit / Community forums (best for high-intent B2C users asking questions or product recommendations)
- "local": Maps / Local Business data (best for B2B brick-and-mortar stores)

CRITICAL: You should ALWAYS recommend "social" for searches to ensure we search on Reddit exclusively. Do NOT recommend "dorking".

If "social" is recommended, you MUST also identify the 5 most relevant subreddits for high-intent conversations.

Return ONLY valid JSON:
{
  "target_type": "b2c" | "b2b",
  "recommended_sources": ["social"],
  "search_intent": "concise description of what they are looking for",
  "keywords": ["keyword1", "keyword2"],
  "subreddits": ["SubredditName1", "SubredditName2"]
}
`;

export async function routeQuery(query, returnUsage = false) {
  try {
    const messages = [
      { role: 'system', content: ROUTER_PROMPT },
      { role: 'user', content: `Query: "${query}"` },
    ];

    const res = await callGemini(messages, { temperature: 0, responseFormat: 'json' });
    const text = res.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(text.substring(start, end + 1));
      } else {
        throw new Error('Invalid JSON format from Router');
      }
    }

    const data = {
      targetType: parsed.target_type || 'b2b',
      sources: ['social'], // Forced social only per user request
      searchIntent: parsed.search_intent || query,
      keywords: parsed.keywords || [query],
      subreddits: parsed.subreddits || []
    };

    if (returnUsage) {
      return {
        data: data,
        usage: { prompt_tokens: res.inputTokens || 0, completion_tokens: res.outputTokens || 0 }
      };
    }

    return data;
  } catch (error) {
    console.error('[Omni-Router] Failed to route query:', error);
    const fallback = {
      targetType: 'b2b',
      sources: ['social'],
      searchIntent: query,
      keywords: [query],
      subreddits: []
    };
    return returnUsage ? { data: fallback, usage: { prompt_tokens: 0, completion_tokens: 0 } } : fallback;
  }
}
