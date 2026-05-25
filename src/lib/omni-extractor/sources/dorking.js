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
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { detectContactsAggressively } from '../detector.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0'
];

const PROXIES = [
  'http://czyysast:hyui5c8xxguq@38.154.203.95:5863',
  'http://czyysast:hyui5c8xxguq@198.105.121.200:6462',
  'http://czyysast:hyui5c8xxguq@64.137.96.74:6641',
  'http://czyysast:hyui5c8xxguq@209.127.138.10:5784',
  'http://czyysast:hyui5c8xxguq@38.154.185.97:6370',
  'http://czyysast:hyui5c8xxguq@84.247.60.125:6095',
  'http://czyysast:hyui5c8xxguq@142.111.67.146:5611',
  'http://czyysast:hyui5c8xxguq@194.39.32.164:6461',
  'http://czyysast:hyui5c8xxguq@191.96.254.138:6185',
  'http://czyysast:hyui5c8xxguq@31.58.9.4:6077'
];

function getUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomProxy() {
  const proxyUrl = PROXIES[Math.floor(Math.random() * PROXIES.length)];
  return new HttpsProxyAgent(proxyUrl);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 500));
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const agent = getRandomProxy();
      
      const res = await fetch(url, {
        ...options,
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': getUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          console.warn(`[Dorking] Blocked by ${new URL(url).hostname} (${res.status}), retrying with delay...`);
          await delay((attempt + 1) * 2000);
          continue;
        }
        return null;
      }
      return res;
    } catch (err) {
      if (err.name === 'AbortError') console.warn(`[Dorking] Timeout for ${url}`);
      if (attempt === retries - 1) return null;
      await delay(1000);
    }
  }
  return null;
}

/**
 * Search via Bing HTML scraping
 */
async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`;
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  try {
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    
    $('li.b_algo').each((i, el) => {
      const title = $(el).find('h2 a').text().trim();
      const link = $(el).find('h2 a').attr('href') || '';
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
      
      if ((title || snippet) && link) {
        results.push({ title, url: link, content: snippet });
      }
    });
    
    if (results.length > 0) {
      console.log(`[Dorking: Bing] Found ${results.length} results for "${query.substring(0, 50)}..."`);
    }
    return results;
  } catch (e) {
    console.error(`[Dorking: Bing] Parse error: ${e.message}`);
    return [];
  }
}

/**
 * Multi-fallback search
 */
async function performSearch(query) {
  // Strategy 1: Bing
  let results = await searchBing(query);
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
