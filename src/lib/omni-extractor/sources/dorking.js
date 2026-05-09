/**
 * Omni-Extractor — Web OSINT & Dorking Module
 * Uses advanced search queries (dorks) to find public contact info.
 */

import * as cheerio from 'cheerio';
import { extractFromHtml, detectContactsAggressively } from '../detector.js';

export async function runDorking(intentData, options = {}) {
  console.log('[Omni-Source: Dorking] Starting OSINT extraction for:', intentData.keywords);
  const leads = [];
  
  const baseKeyword = intentData.keywords[0] || 'skincare';
  
  const dorks = [
    `"${baseKeyword}" ("@gmail.com" OR "@yahoo.com" OR "@hotmail.com")`,
  ];
  
  // Make it aggressive if premium
  if (options.isPremium) {
    dorks.push(`"${baseKeyword}" ("contact me at" OR "email me at")`);
    dorks.push(`site:instagram.com "${baseKeyword}" "@gmail.com"`);
    dorks.push(`site:twitter.com OR site:x.com "${baseKeyword}" "@gmail.com"`);
  }
  
  try {
    for (const query of dorks) {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        }
      });

      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      // Parse search results
      $('.result').each((i, el) => {
        const title = $(el).find('.result__title').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        const link = $(el).find('.result__url').attr('href') || '';
        
        const contacts = detectContactsAggressively(title + ' ' + snippet);
        
        if (contacts.emails.length > 0 || contacts.phones.length > 0 || contacts.socials.length > 0) {
          leads.push({
            source: 'dorking',
            link: link,
            context: snippet,
            raw_contacts: contacts
          });
        }
      });
      // sleep slightly to prevent ratelimiting
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('[Omni-Source: Dorking] Error:', error.message);
  }

  return leads;
}
