/**
 * Omni-Extractor — Web OSINT & Dorking Module
 * Uses advanced search queries (dorks) to find public contact info.
 */

import * as cheerio from 'cheerio';
import { extractFromHtml, detectContactsAggressively } from '../detector.js';

export async function runDorking(intentData, options = {}) {
  console.log('[Omni-Source: Dorking] Starting aggressive OSINT extraction...');
  const leads = [];
  const leadsMap = new Map(); // Prevent duplicates
  
  const searchKeywords = intentData.keywords.slice(0, 3);
  
  try {
    for (const keyword of searchKeywords) {
      const dorks = [
        `"${keyword}" ("@gmail.com" OR "@yahoo.com" OR "@hotmail.com")`,
        `site:instagram.com "${keyword}" "@gmail.com"`,
        `site:twitter.com OR site:x.com "${keyword}" "@gmail.com"`,
        `site:linkedin.com/in/ "${keyword}" ("@gmail.com" OR "contact me")`,
        `site:facebook.com "${keyword}" "email me"`,
        `"${keyword}" ("contact me at" OR "email me at" OR "whatsapp")`
      ];
      
      // If not premium, only use the first 3 dorks to save time/resources
      const activeDorks = options.isPremium ? dorks : dorks.slice(0, 3);

      for (const query of activeDorks) {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          }
        });

        if (!res.ok) {
          console.warn(`[Omni-Source: Dorking] DuckDuckGo returned ${res.status} for keyword "${keyword}"`);
          continue;
        }
        const html = await res.text();
        const $ = cheerio.load(html);

        // Parse search results
        $('.result').each((i, el) => {
          const title = $(el).find('.result__title').text().trim();
          const snippet = $(el).find('.result__snippet').text().trim();
          const link = $(el).find('.result__url').attr('href') || '';
          
          if (leadsMap.has(link)) return;

          const contacts = detectContactsAggressively(title + ' ' + snippet);
          
          if (contacts.emails.length > 0 || contacts.phones.length > 0 || contacts.socials.length > 0) {
            const lead = {
              source: 'web_osint',
              link: link,
              context: snippet,
              raw_contacts: contacts
            };
            leadsMap.set(link, lead);
            leads.push(lead);
          }
        });
        // sleep slightly to prevent ratelimiting
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } catch (error) {
    console.error('[Omni-Source: Dorking] Error:', error.message);
  }

  return leads;
}
