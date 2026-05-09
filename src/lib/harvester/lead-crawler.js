/**
 * LeadHarvester — Web Crawler
 * Lightweight fetch-based crawler with auto URL discovery.
 * Uses Cheerio for HTML parsing. No browser automation needed for MVP.
 */

import * as cheerio from 'cheerio';
import { hasContactSignals } from './lead-detector.js';
import { callGemini } from '../gemini.js';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const RATE_LIMIT_MS = 1200; // 1.2 seconds between requests
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Discover URLs to crawl based on a natural language query.
 * Uses AI to generate relevant company/directory URLs.
 */
export async function discoverUrls(query, maxUrls = 10) {
  console.log(`[Crawler] Discovering URLs for: "${query}"`);

  try {
    const messages = [
      {
        role: 'system',
        content: `You are an expert web researcher. Given a business lead search query, generate a list of real website URLs that are likely to contain business contact information (emails, phones, contact forms) for the type of businesses described.

STRATEGIES:
1. COMPANY DIRECTORIES: Industry-specific directories (e.g., clutch.co, g2.com, yelp.com)
2. DIRECT COMPANY SITES: Real company websites with /contact or /about pages
3. PROFESSIONAL NETWORKS: LinkedIn company pages, Crunchbase profiles
4. LOCAL DIRECTORIES: Google Maps listings, Yellow Pages, BBB
5. INDUSTRY PORTALS: Niche business listings and associations

RULES:
- Return 8-12 real, working URLs that actually exist
- Prioritize pages with contact information (contact pages, team pages, about pages)
- Include a mix of directories and direct company sites
- Focus on the specific industry/location mentioned in the query
- Only return URLs you are confident exist

Return ONLY a JSON array of URL strings: ["https://...", "https://..."]
No markdown, no explanation.`
      },
      {
        role: 'user',
        content: `Find business contact pages for: "${query}"`
      }
    ];

    const res = await callGemini(messages, { temperature: 0.3, responseFormat: 'json' });
    const cleaned = res.text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    let urls = [];
    try {
      urls = JSON.parse(cleaned);
    } catch {
      // Try to extract URLs from text
      const urlPattern = /https?:\/\/[^\s"',\]]+/g;
      urls = cleaned.match(urlPattern) || [];
    }

    if (!Array.isArray(urls)) urls = [];
    urls = urls.filter(u => typeof u === 'string' && u.startsWith('http')).slice(0, maxUrls);

    console.log(`[Crawler] Discovered ${urls.length} URLs`);
    return urls;
  } catch (error) {
    console.error('[Crawler] URL discovery failed:', error.message);
    // Fallback: generate directory URLs from query keywords
    return generateFallbackUrls(query);
  }
}

/**
 * Generate fallback directory URLs when AI discovery fails.
 */
function generateFallbackUrls(query) {
  const encoded = encodeURIComponent(query);
  return [
    `https://www.google.com/search?q=${encoded}+contact`,
    `https://www.yelp.com/search?find_desc=${encoded}`,
    `https://www.bbb.org/search?find_text=${encoded}`,
  ];
}

/**
 * Fetch a single page and return parsed content.
 */
export async function fetchPage(url, timeout = 15000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Crawler] ${url} returned ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      console.warn(`[Crawler] ${url} is not HTML (${contentType})`);
      return null;
    }

    const html = await response.text();
    if (html.length < 100) return null; // Too small to be useful

    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Extract same-domain links for depth crawling
    const baseUrl = new URL(url);
    const links = [];
    $('a[href]').each((_, el) => {
      try {
        const href = $(el).attr('href');
        if (!href) return;
        const resolved = new URL(href, url);
        if (resolved.hostname === baseUrl.hostname && resolved.href !== url) {
          links.push(resolved.href);
        }
      } catch { /* invalid URL */ }
    });

    return {
      url: response.url, // Final URL after redirects
      html,
      text: text.slice(0, 50000), // Cap text at 50k chars
      links: [...new Set(links)],
      statusCode: response.status,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[Crawler] ${url} timed out`);
    } else {
      console.warn(`[Crawler] ${url} failed:`, error.message);
    }
    return null;
  }
}

/**
 * Prioritize which discovered links to follow (prefer contact/about/team pages).
 */
function prioritizeLinks(links) {
  const highPriority = /\/(contact|about|team|people|staff|leadership|our-team|meet|directory|sales)/i;
  const medPriority = /\/(services|solutions|pricing|demo|consultation|quote)/i;
  const lowPriority = /\/(blog|news|press|careers|jobs|privacy|terms|cookie|faq)/i;

  const scored = links.map(url => {
    let priority = 2; // default medium
    if (highPriority.test(url)) priority = 0;
    else if (medPriority.test(url)) priority = 1;
    else if (lowPriority.test(url)) priority = 3;
    return { url, priority };
  });

  return scored
    .sort((a, b) => a.priority - b.priority)
    .map(s => s.url);
}

/**
 * Crawl a starting URL and optionally follow links.
 * @param {string} startUrl - Starting URL
 * @param {Object} options
 * @param {number} options.depth - How many levels of links to follow (0 = start only, 1 = start + immediate links)
 * @param {number} options.maxPages - Maximum total pages to crawl
 * @param {Function} options.onPage - Callback per page: (pageData) => void
 * @returns {Array} All crawled pages
 */
export async function crawlSite(startUrl, { depth = 1, maxPages = 10, onPage = null } = {}) {
  const visited = new Set();
  const pages = [];
  const queue = [{ url: startUrl, currentDepth: 0 }];

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, currentDepth } = queue.shift();

    // Normalize URL
    let normalized;
    try {
      normalized = new URL(url).href;
    } catch {
      continue;
    }

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    // Rate limit
    if (pages.length > 0) await sleep(RATE_LIMIT_MS);

    console.log(`[Crawler] [${pages.length + 1}/${maxPages}] Fetching: ${normalized}`);
    const page = await fetchPage(normalized);

    if (!page) continue;
    pages.push(page);
    if (onPage) onPage(page);

    // Follow links if we haven't reached max depth
    if (currentDepth < depth && page.links.length > 0) {
      const prioritized = prioritizeLinks(page.links);
      const toFollow = prioritized.slice(0, 5); // Max 5 links per page

      for (const link of toFollow) {
        if (!visited.has(link) && pages.length + queue.length < maxPages) {
          queue.push({ url: link, currentDepth: currentDepth + 1 });
        }
      }
    }
  }

  console.log(`[Crawler] Crawled ${pages.length} pages total`);
  return pages;
}

/**
 * Full discovery + crawl pipeline.
 * @param {string} query - Natural language search query
 * @param {Object} options - Crawl options
 * @returns {{ pages: Array, discoveredUrls: Array }}
 */
export async function discoverAndCrawl(query, { depth = 1, maxPages = 15, maxUrls = 8, onPage = null } = {}) {
  // Step 1: AI-powered URL discovery
  const urls = await discoverUrls(query, maxUrls);

  // Step 2: Crawl each discovered URL
  const allPages = [];
  const pagesPerUrl = Math.max(2, Math.floor(maxPages / urls.length));

  for (const url of urls) {
    if (allPages.length >= maxPages) break;

    const remaining = maxPages - allPages.length;
    const sitePages = await crawlSite(url, {
      depth,
      maxPages: Math.min(pagesPerUrl, remaining),
      onPage,
    });

    allPages.push(...sitePages);
  }

  return { pages: allPages, discoveredUrls: urls };
}
