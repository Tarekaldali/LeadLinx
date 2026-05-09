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
- "dorking": Web OSINT / Google Dorking (best for finding public emails on social media like Instagram/Twitter, or generic web mentions)
- "social": Reddit / Community forums (best for high-intent B2C users asking questions or product recommendations)
- "local": Maps / Local Business data (best for B2B brick-and-mortar stores)

Return ONLY valid JSON:
{
  "target_type": "b2c" | "b2b",
  "recommended_sources": ["dorking", "social", "local"],
  "search_intent": "concise description of what they are looking for",
  "keywords": ["keyword1", "keyword2"]
}
`;

export async function routeQuery(query) {
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

    return {
      targetType: parsed.target_type || 'b2b',
      sources: parsed.recommended_sources || ['dorking'],
      searchIntent: parsed.search_intent || query,
      keywords: parsed.keywords || [query]
    };
  } catch (error) {
    console.error('[Omni-Router] Failed to route query:', error);
    // Fallback strategy: try everything
    return {
      targetType: 'b2b',
      sources: ['dorking', 'social'],
      searchIntent: query,
      keywords: [query]
    };
  }
}
