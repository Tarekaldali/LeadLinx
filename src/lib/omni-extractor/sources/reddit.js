/**
 * Omni-Extractor — Reddit & Community Module
 * Multi-fallback Reddit extraction.
 * 
 * Strategy:
 *   1. Direct search intent fallback via Reddit search JSON
 *   2. Reddit RSS/Atom feeds
 */

import { detectContactsAggressively } from '../detector.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

function getUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 500));
}

/**
 * Fetch with retry and timeout using native global fetch
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': getUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      if (res.status === 429) {
        console.warn(`[Reddit] Rate limited (429), waiting ${(attempt + 1) * 2}s...`);
        await delay((attempt + 1) * 2000);
        continue;
      }
      
      if (res.status === 403) {
        console.warn(`[Reddit] Forbidden (403) for ${url}, trying next source...`);
        return null; // Don't retry on 403
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      return res;
    } catch (err) {
      console.warn(`[Reddit] Fetch error on attempt ${attempt + 1}: ${err.message}`);
      if (attempt === retries - 1) return null;
      await delay(1000 * (attempt + 1));
    }
  }
  return null;
}

/**
 * Parse Reddit RSS/Atom XML feed into posts
 */
function parseRSSFeed(xmlText) {
  const posts = [];
  const entries = xmlText.split('<entry>').slice(1);
  
  for (const entry of entries) {
    try {
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      const linkMatch = entry.match(/<link[^>]*href="([^"]*)"[^>]*\/>/);
      const authorMatch = entry.match(/<name>([\s\S]*?)<\/name>/);
      const categoryMatch = entry.match(/<category[^>]*term="([^"]*)"[^>]*\/>/);
      
      const title = (titleMatch?.[1] || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const content = (contentMatch?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
      const link = linkMatch?.[1] || '';
      const author = (authorMatch?.[1] || '').replace('/u/', '').trim();
      const subreddit = categoryMatch?.[1] || '';
      
      if (title && author && author !== '[deleted]' && author !== 'AutoModerator') {
        posts.push({ title, selftext: content, author, permalink: link, subreddit, id: link });
      }
    } catch (e) {
      // Skip malformed entries
    }
  }
  
  return posts;
}

async function fetchRedditRSS(subreddit, keyword, sort = 'new') {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.rss?q=${query}&sort=${sort}&restrict_sr=on&t=year&type=link`
    : `https://www.reddit.com/search.rss?q=${query}&sort=${sort}&t=year&limit=100&type=link`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  const text = await res.text();
  const posts = parseRSSFeed(text);
  console.log(`[Reddit RSS] ${subreddit || 'global'} + "${keyword}" (${sort}): ${posts.length} posts`);
  return posts;
}

async function fetchRedditJSON(subreddit, keyword, limit = 100, sort = 'new') {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&sort=${sort}&restrict_sr=on&t=year&limit=${limit}&type=link`
    : `https://www.reddit.com/search.json?q=${query}&sort=${sort}&t=year&limit=${limit}&type=link`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  try {
    const data = await res.json();
    const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);
    console.log(`[Reddit JSON] ${subreddit || 'global'} + "${keyword}" (${sort}): ${posts.length} posts`);
    return posts;
  } catch {
    return [];
  }
}

async function fetchRedditPosts(subreddit, keyword, limit = 50) {
  const allPosts = new Map();
  
  // Pass 1: Sort by NEW (recent high-intent)
  let posts = await fetchRedditJSON(subreddit, keyword, limit, 'new');
  posts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  
  await delay(100);
  
  // Pass 2: Sort by RELEVANCE (highest quality matches)
  const relevantPosts = await fetchRedditJSON(subreddit, keyword, limit, 'relevance');
  relevantPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  
  // If JSON returned nothing, fall back to RSS
  if (allPosts.size === 0) {
    await delay(100);
    const rssPosts = await fetchRedditRSS(subreddit, keyword);
    rssPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  }
  
  return Array.from(allPosts.values());
}

export async function runSocialExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Social] Starting Reddit extraction...');
  const leads = [];
  const leadsMap = new Map();
  
  const searchKeywords = intentData.keywords.slice(0, 6);
  const subreddits = intentData.subreddits || [];
  
  // 1. Generate search combinations (up to 6 subreddits * 6 keywords = 36 requests)
  const combinations = [];
  for (const sub of subreddits.slice(0, 6)) {
    for (const keyword of searchKeywords) {
      combinations.push({ sub, keyword });
    }
  }

  // 2. Process in parallel chunks to avoid Vercel timeouts (10s) and Reddit rate limits
  const CHUNK_SIZE = 10; 
  for (let i = 0; i < combinations.length; i += CHUNK_SIZE) {
    const chunk = combinations.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(chunk.map(async ({ sub, keyword }) => {
      try {
        const posts = await fetchRedditPosts(sub, keyword, options.isPremium ? 50 : 30);
        for (const p of posts) {
          if (!p || leadsMap.has(p.id)) continue;
          processPost(p, sub);
        }
      } catch (err) {
        console.error(`[Reddit] Failed for ${sub} + ${keyword}:`, err.message);
      }
    }));
    
    // Tiny delay between chunks to respect rate limits
    if (i + CHUNK_SIZE < combinations.length) {
      await delay(150);
    }
  }
  
  // 2. Global Keyword Search — run for ALL keywords for maximum coverage
  for (const keyword of searchKeywords) {
    const posts = await fetchRedditPosts(null, keyword, options.isPremium ? 100 : 50);
    
    for (const p of posts) {
      if (!p || leadsMap.has(p.id)) continue;
      processPost(p);
    }
    
    await delay(300);
  }
  
  function processPost(p, fallbackSubreddit) {
    const title = p.title || '';
    const selftext = p.selftext || '';
    const author = p.author;
    const subreddit = p.subreddit || fallbackSubreddit || 'unknown';
    
    let url;
    if (p.permalink && p.permalink.startsWith('http')) {
      url = p.permalink;
    } else if (p.permalink) {
      url = `https://reddit.com${p.permalink}`;
    } else if (p.id && p.id.startsWith('http')) {
      url = p.id;
    } else {
      url = `https://reddit.com/r/${subreddit}/comments/${p.id || 'unknown'}`;
    }
    
    const context = title + '\n' + selftext;
    const contacts = detectContactsAggressively(context);
    
    if (!contacts.socials.includes(`reddit:@${author}`)) {
      contacts.socials.push(`reddit:@${author}`);
    }
    
    if (author && author !== '[deleted]' && author !== 'AutoModerator') {
      const lead = {
        source: 'reddit',
        subreddit: subreddit,
        name: author,
        title: title,
        link: url,
        context: context,
        raw_contacts: contacts
      };
      leadsMap.set(p.id, lead);
      leads.push(lead);
    }
  }
  
  console.log(`[Omni-Source: Social] Total leads extracted: ${leads.length}`);
  return leads;
}
