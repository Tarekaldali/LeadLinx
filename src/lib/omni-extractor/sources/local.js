/**
 * Omni-Extractor — Local Business Module
 * Extracts local businesses using Overpass API (OpenStreetMap).
 */

import { detectContactsAggressively } from '../detector.js';

export async function runLocalExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Local] Starting Local Maps extraction for:', intentData.keywords);
  const leads = [];
  
  const keyword = intentData.keywords[0].replace(/[^a-zA-Z0-9]/g, ' ');
  const limit = options.isPremium ? 50 : 10;
  const query = `
    [out:json][timeout:25];
    node["name"~"${keyword}",i](around:50000, 40.7128, -74.0060); // Default to NY area for MVP demo
    out ${limit};
  `;
  
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });

    if (!res.ok) throw new Error(`Overpass API failed: ${res.status}`);
    const data = await res.json();
    
    for (const element of data.elements) {
      if (!element.tags) continue;
      
      const tags = element.tags;
      const name = tags.name || 'Unknown Business';
      const website = tags.website || tags['contact:website'];
      const phone = tags.phone || tags['contact:phone'];
      const email = tags.email || tags['contact:email'];
      
      const contacts = { emails: [], phones: [], socials: [] };
      if (email) contacts.emails.push(email);
      if (phone) contacts.phones.push(phone);
      
      // If we have a website, we should ideally crawl it (delegated to orchestrator)
      
      leads.push({
        source: 'local_maps',
        link: website || `https://www.openstreetmap.org/node/${element.id}`,
        context: `Local business: ${name}. ${tags.amenity || ''} ${tags.shop || ''}`,
        raw_contacts: contacts,
        name: name
      });
    }

  } catch (error) {
    console.error('[Omni-Source: Local] Error:', error.message);
  }

  return leads;
}
