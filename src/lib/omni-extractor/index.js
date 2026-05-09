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
  
  // 1. Intelligent Routing
  const routeData = await routeQuery(query);
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
  
  // 3. LLM Validation & Scoring (Concurrently for performance, limit batch size in prod)
  const validatedLeads = [];
  const BATCH_SIZE = 5; // Process in small batches
  
  for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
    const batch = rawLeads.slice(i, i + BATCH_SIZE);
    
    const validations = await Promise.all(batch.map(async (rawLead) => {
      // If there are no contacts at all, skip LLM validation to save costs
      const contactCount = rawLead.raw_contacts.emails.length + 
                           rawLead.raw_contacts.phones.length + 
                           rawLead.raw_contacts.socials.length;
                           
      if (contactCount === 0 && rawLead.source !== 'local_maps') {
         return null; 
      }
      
      const validation = await validateLeadIntent(
        rawLead.context, 
        rawLead.raw_contacts, 
        routeData.searchIntent
      );
      
      if (validation.is_valid_lead) {
        return {
          id: Math.random().toString(36).substring(2, 15),
          score: Math.round(validation.confidence_score * 100),
          author: validation.lead_name || rawLead.name || 'Unknown',
          company: rawLead.source === 'local_maps' ? rawLead.name : null,
          title: routeData.searchIntent,
          link: rawLead.link,
          source: rawLead.source,
          emails: validation.verified_contacts.emails || [],
          phones: validation.verified_contacts.phones || [],
          socials: validation.verified_contacts.socials || [],
          reasoning: validation.reasoning
        };
      }
      return null;
    }));
    
    validatedLeads.push(...validations.filter(Boolean));
  }
  
  // Sort by score
  validatedLeads.sort((a, b) => b.score - a.score);
  
  console.log(`✅ [Omni-Extractor] Successfully validated ${validatedLeads.length} high-intent leads.`);
  
  return {
    jobId: `omni_${Date.now()}`,
    query: query,
    route_data: routeData,
    stats: {
      rawFound: rawLeads.length,
      validated: validatedLeads.length
    },
    leads: validatedLeads
  };
}
