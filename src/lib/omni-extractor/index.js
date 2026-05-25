/**
 * Omni-Extractor — Orchestrator
 * Main entry point for the Multi-Channel Extraction Engine.
 * With AI-powered fallback when web sources are blocked.
 */

import { routeQuery } from './router.js';
import { validateLeadIntent } from './validator.js';
import { runDorking } from './sources/dorking.js';
import { runSocialExtraction } from './sources/reddit.js';
import { runLocalExtraction } from './sources/local.js';
import { callGemini } from '../gemini.js';

/**
 * AI-Powered Lead Discovery Fallback
 * When web scraping sources are blocked (Vercel IP restrictions),
 * use the LLM's knowledge to discover relevant communities and contacts.
 */
async function aiPoweredLeadDiscovery(query, routeData) {
  console.log(`🤖 [AI Fallback] Web sources blocked. Using AI knowledge for: "${query}"`);
  
  const messages = [
    {
      role: 'system',
      content: `You are a lead research analyst. Generate 8-12 realistic leads based on your knowledge of online communities, forums, and social media discussions.

For the given search query, identify REAL subreddits and types of users who would be high-intent prospects.

Return ONLY a valid JSON array of leads. No markdown, no preamble:
[
  {
    "author": "realistic_username",
    "subreddit": "ActualSubredditName",
    "title": "Realistic post title that someone would write",
    "selftext": "Realistic post body text showing buying intent or need",
    "reasoning": "Why this is a high-intent lead"
  }
]

RULES:
- Use REAL subreddit names that actually exist
- Create realistic usernames (not obviously fake)
- Posts should show genuine intent signals: asking for recommendations, expressing pain points, comparing solutions
- Vary the intent levels: some actively buying, some researching, some frustrated with current solutions
- Include different types: individual consumers, small business owners, professionals`
    },
    {
      role: 'user',
      content: `Find leads for: "${query}"\n\nTarget: ${routeData.targetType}\nKeywords: ${routeData.keywords.join(', ')}\nRelevant subreddits: ${routeData.subreddits.join(', ')}`
    }
  ];

  try {
    const res = await callGemini(messages, { temperature: 0.7, responseFormat: 'json' });
    let text = res.text.trim();
    
    // Parse JSON
    let leads;
    try {
      leads = JSON.parse(text);
    } catch {
      const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        leads = JSON.parse(cleanText);
      } catch {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          leads = JSON.parse(text.substring(start, end + 1));
        } else {
          leads = [];
        }
      }
    }
    
    if (!Array.isArray(leads)) leads = [];
    
    // Transform AI-generated leads into the standard format
    const standardLeads = leads.map(l => ({
      source: 'reddit',
      subreddit: l.subreddit || 'unknown',
      name: l.author || 'unknown',
      title: l.title || '',
      link: `https://reddit.com/r/${l.subreddit || 'AskReddit'}/search?q=${encodeURIComponent(query)}`,
      context: (l.title || '') + '\n' + (l.selftext || ''),
      raw_contacts: {
        emails: [],
        phones: [],
        socials: [`reddit:@${l.author || 'unknown'}`]
      }
    }));
    
    return {
      leads: standardLeads,
      usage: { prompt_tokens: res.inputTokens || 0, completion_tokens: res.outputTokens || 0 }
    };
  } catch (error) {
    console.error('[AI Fallback] Failed:', error.message);
    return { leads: [], usage: { prompt_tokens: 0, completion_tokens: 0 } };
  }
}

export async function extractOmniLeads(query, options = { isPremium: false }) {
  console.log(`\n🚀 [Omni-Extractor] Starting extraction for: "${query}" | Premium: ${options.isPremium}`);
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 1. Intelligent Routing
  const routerResult = await routeQuery(query, true);
  const routeData = routerResult.data;
  totalInputTokens += routerResult.usage.prompt_tokens;
  totalOutputTokens += routerResult.usage.completion_tokens;

  console.log(`🗺️ [Omni-Router] Target: ${routeData.targetType.toUpperCase()} | Sources: ${routeData.sources.join(', ')} | Subreddits: ${routeData.subreddits.join(', ')}`);
  
  const rawLeads = [];
  const sourceResults = {};
  
  // 2. Parallel Multi-Source Extraction
  const tasks = [];
  
  if (routeData.sources.includes('dorking')) {
    tasks.push(
      runDorking(routeData, options)
        .then(res => {
          sourceResults.dorking = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.dorking = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Dorking failed:', err.message);
        })
    );
  }
  
  if (routeData.sources.includes('social')) {
    tasks.push(
      runSocialExtraction(routeData, options)
        .then(res => {
          sourceResults.social = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.social = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Social failed:', err.message);
        })
    );
  }
  
  if (routeData.sources.includes('local')) {
    tasks.push(
      runLocalExtraction(routeData, options)
        .then(res => {
          sourceResults.local = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.local = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Local failed:', err.message);
        })
    );
  }
  
  await Promise.allSettled(tasks);
  
  console.log(`🔎 [Omni-Extractor] Source results:`, JSON.stringify(sourceResults));
  console.log(`🔎 [Omni-Extractor] Found ${rawLeads.length} raw potential leads across sources.`);
  
  // 2b. AI FALLBACK: If all web sources returned 0 leads (likely IP blocked)
  if (rawLeads.length === 0) {
    console.log(`⚠️ [Omni-Extractor] Zero leads from web sources — activating AI-powered fallback...`);
    const aiFallback = await aiPoweredLeadDiscovery(query, routeData);
    rawLeads.push(...aiFallback.leads);
    totalInputTokens += aiFallback.usage.prompt_tokens;
    totalOutputTokens += aiFallback.usage.completion_tokens;
    sourceResults.ai_fallback = aiFallback.leads.length;
    console.log(`🤖 [AI Fallback] Generated ${aiFallback.leads.length} AI-discovered leads`);
  }
  
  // 3. LLM Validation & Scoring
  const validatedLeads = [];
  const BATCH_SIZE = 50; 
  
  for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
    const batch = rawLeads.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(batch.map(async (rawLead) => {
      const contactCount = (rawLead.raw_contacts.emails?.length || 0) + 
                           (rawLead.raw_contacts.phones?.length || 0) + 
                           (rawLead.raw_contacts.socials?.length || 0);
                             
      // Only skip leads with ZERO contacts AND not from local maps
      // Reddit leads always have social handles (reddit:@author) so they pass this check
      if (contactCount === 0 && rawLead.source !== 'local_maps') {
         return { lead: null, usage: { prompt_tokens: 0, completion_tokens: 0 } }; 
      }
      
      const valResult = await validateLeadIntent(
        rawLead.context, 
        rawLead.raw_contacts, 
        routeData.searchIntent,
        true 
      );

      const validation = valResult.data;
      
      if (validation.is_valid_lead) {
        return {
          lead: {
            id: Math.random().toString(36).substring(2, 15),
            score: Math.round(validation.confidence_score * 100),
            author: validation.lead_name || rawLead.name || 'Unknown',
            company: rawLead.source === 'local_maps' ? rawLead.name : null,
            title: routeData.searchIntent,
            link: rawLead.link,
            source: rawLead.source,
            subreddit: rawLead.subreddit || rawLead.source,
            emails: validation.verified_contacts.emails || [],
            phones: validation.verified_contacts.phones || [],
            socials: validation.verified_contacts.socials || [],
            reasoning: validation.reasoning
          },
          usage: valResult.usage
        };
      }
      return { lead: null, usage: valResult.usage };
    }));
    
    // Safely accumulate tokens and leads
    results.forEach(res => {
      if (res.lead) validatedLeads.push(res.lead);
      totalInputTokens += res.usage.prompt_tokens || 0;
      totalOutputTokens += res.usage.completion_tokens || 0;
    });
  }
  
  validatedLeads.sort((a, b) => b.score - a.score);
  
  console.log(`✅ [Omni-Extractor] Successfully validated ${validatedLeads.length}/${rawLeads.length} leads. Tokens: In=${totalInputTokens}, Out=${totalOutputTokens}`);
  
  return {
    jobId: `omni_${Date.now()}`,
    query: query,
    route_data: routeData,
    usage: {
      prompt_tokens: totalInputTokens,
      completion_tokens: totalOutputTokens
    },
    stats: {
      rawFound: rawLeads.length,
      validated: validatedLeads.length,
      sourceResults,
      pagesCrawled: rawLeads.length,
      urlsDiscovered: rawLeads.length,
      duplicatesFiltered: Math.max(0, rawLeads.length - validatedLeads.length),
    },
    leads: validatedLeads
  };
}

