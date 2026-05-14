/**
 * Omni-Extractor — Orchestrator
 * Main entry point for the Multi-Channel Extraction Engine.
 */

import { routeQuery } from './router.js';
import { validateLeadIntent } from './validator.js';
import { runDorking } from './sources/dorking.js';
import { runSocialExtraction } from './sources/reddit.js';
import { runLocalExtraction } from './sources/local.js';

export async function extractOmniLeads(query, options = { isPremium: false }) {
  console.log(`\n🚀 [Omni-Extractor] Starting extraction for: "${query}" | Premium: ${options.isPremium}`);
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 1. Intelligent Routing
  const routerResult = await routeQuery(query, true); // Modified to return tokens
  const routeData = routerResult.data;
  totalInputTokens += routerResult.usage.prompt_tokens;
  totalOutputTokens += routerResult.usage.completion_tokens;

  console.log(`🗺️ [Omni-Router] Target: ${routeData.targetType.toUpperCase()} | Sources: ${routeData.sources.join(', ')}`);
  
  const rawLeads = [];
  
  // 2. Parallel Multi-Source Extraction
  const tasks = [];
  
  if (routeData.sources.includes('dorking')) {
    tasks.push(runDorking(routeData, options).then(res => rawLeads.push(...res)));
  }
  
  if (routeData.sources.includes('social')) {
    tasks.push(runSocialExtraction(routeData, options).then(res => rawLeads.push(...res)));
  }
  
  if (routeData.sources.includes('local')) {
    tasks.push(runLocalExtraction(routeData, options).then(res => rawLeads.push(...res)));
  }
  
  await Promise.allSettled(tasks);
  
  console.log(`🔎 [Omni-Extractor] Found ${rawLeads.length} raw potential leads across sources.`);
  
  // 3. LLM Validation & Scoring
  const validatedLeads = [];
  const BATCH_SIZE = 50; 
  
  for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
    const batch = rawLeads.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(batch.map(async (rawLead) => {
      const contactCount = rawLead.raw_contacts.emails.length + 
                           rawLead.raw_contacts.phones.length + 
                           rawLead.raw_contacts.socials.length;
                             
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
  
  console.log(`✅ [Omni-Extractor] Successfully validated ${validatedLeads.length} leads. Tokens: In=${totalInputTokens}, Out=${totalOutputTokens}`);
  
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
      validated: validatedLeads.length
    },
    leads: validatedLeads
  };
}
