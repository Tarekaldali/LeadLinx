/**
 * Omni-Extractor — Web OSINT & Dorking Module
 * Multi-fallback search that works on Vercel serverless.
 * 
 * Strategy:
 *   1. SearXNG public instances (privacy meta-search, doesn't block servers)
 *   2. DuckDuckGo HTML (may work intermittently)
 *   3. Direct web page crawling as last resort
 */

import * as cheerio from 'cheerio';
import { extractFromHtml, detectContactsAggressively } from '../detector.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

function getUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 300));
}

async function safeFetch(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': getUA(),
        'Accept': 'text/html,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

/**
 * Search via SearXNG public instances (JSON API)
 */
async function searchSearXNG(query) {
  const instances = [
    'https://search.sapti.me',
    'https://searx.be',
    'https://search.bus-hit.me',
    'https://searx.tiekoetter.com',
    'https://search.ononoki.org',
  ];
  
  for (const instance of instances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo&language=en`;
      const res = await safeFetch(url);
      if (!res) continue;
      
      const data = await res.json();
      const results = data.results || [];
      
      if (results.length > 0) {
        console.log(`[Dorking: SearXNG] ${instance} returned ${results.length} results for "${query.substring(0, 50)}..."`);
        return results.map(r => ({
          title: r.title || '',
          url: r.url || '',
          content: r.content || '',
        }));
      }
    } catch (e) {
      console.warn(`[Dorking: SearXNG] ${instance} failed:`, e.message);
    }
    await delay(500);
  }
  
  return [];
}

/**
 * Search via DuckDuckGo HTML (may work intermittently on Vercel)
 */
async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await safeFetch(url);
  if (!res) return [];
  
  try {
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    
    $('.result').each((i, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').attr('href') || '';
      
      if (title || snippet) {
        results.push({ title, url: link, content: snippet });
      }
    });
    
    if (results.length > 0) {
      console.log(`[Dorking: DDG] Found ${results.length} results for "${query.substring(0, 50)}..."`);
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Multi-fallback search
 */
async function performSearch(query) {
  // Strategy 1: SearXNG
  let results = await searchSearXNG(query);
  if (results.length > 0) return results;
  
  await delay(300);
  
  // Strategy 2: DuckDuckGo HTML
  results = await searchDuckDuckGo(query);
  return results;
}

export async function runDorking(intentData, options = {}) {
  console.log('[Omni-Source: Dorking] Starting multi-fallback OSINT extraction...');
  const leads = [];
  const leadsMap = new Map();
  
  const searchKeywords = intentData.keywords.slice(0, 3);
  
  try {
    for (const keyword of searchKeywords) {
      // Build targeted search queries (dorks)
      const dorks = [
        `"${keyword}" ("@gmail.com" OR "@yahoo.com" OR "@hotmail.com")`,
        `"${keyword}" ("contact me" OR "email me" OR "whatsapp" OR "DM me")`,
        `"${keyword}" site:instagram.com "@gmail.com"`,
        `"${keyword}" ("need help" OR "looking for" OR "recommendation")`,
        `"${keyword}" ("hire" OR "freelancer" OR "consultant" OR "agency")`,
        `"${keyword}" site:linkedin.com ("@gmail.com" OR "contact")`,
      ];
      
      // Limit dorks based on plan
      const activeDorks = options.isPremium ? dorks : dorks.slice(0, 3);
      
      for (const query of activeDorks) {
        const results = await performSearch(query);
        
        for (const result of results) {
          if (leadsMap.has(result.url)) continue;
          
          const fullText = (result.title || '') + ' ' + (result.content || '');
          const contacts = detectContactsAggressively(fullText);
          
          // Accept leads with any contact info detected
          if (contacts.emails.length > 0 || contacts.phones.length > 0 || contacts.socials.length > 0) {
            const lead = {
              source: 'web_osint',
              link: result.url,
              context: result.content || result.title || '',
              raw_contacts: contacts,
              name: result.title?.split('-')?.[0]?.trim() || 'Web Lead',
            };
            leadsMap.set(result.url, lead);
            leads.push(lead);
          }
        }
        
        await delay(800);
      }
    }
    
    // Bonus: Try a broader search for the raw intent
    if (leads.length < 5 && intentData.searchIntent) {
      const broadQuery = `"${intentData.searchIntent}" contact email`;
      const broadResults = await performSearch(broadQuery);
      
      for (const result of broadResults) {
        if (leadsMap.has(result.url)) continue;
        
        const fullText = (result.title || '') + ' ' + (result.content || '');
        const contacts = detectContactsAggressively(fullText);
        
        if (contacts.emails.length > 0 || contacts.phones.length > 0 || contacts.socials.length > 0) {
          const lead = {
            source: 'web_osint',
            link: result.url,
            context: result.content || result.title || '',
            raw_contacts: contacts,
            name: result.title?.split('-')?.[0]?.trim() || 'Web Lead',
          };
          leadsMap.set(result.url, lead);
          leads.push(lead);
        }
      }
    }
    
  } catch (error) {
    console.error('[Omni-Source: Dorking] Error:', error.message);
  }
  
  console.log(`[Omni-Source: Dorking] Total OSINT leads: ${leads.length}`);
  return leads;
}
