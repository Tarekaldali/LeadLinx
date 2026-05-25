/**
 * Omni-Extractor — Reddit & Community Module
 * Multi-fallback Reddit extraction that works on Vercel datacenter IPs.
 * 
 * Strategy:
 *   1. Reddit RSS/Atom feeds (not blocked on server IPs)
 *   2. old.reddit.com JSON (more lenient than www.reddit.com)
 *   3. Direct search intent fallback via Reddit search
 */

import { detectContactsAggressively } from '../detector.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
];

function getUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 500));
}

/**
 * Fetch with retry and timeout
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': getUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      
      if (res.status === 429) {
        console.warn(`[Reddit] Rate limited (429), waiting ${(attempt + 1) * 2}s...`);
        await delay((attempt + 1) * 2000);
        continue;
      }
      
      if (res.status === 403) {
        console.warn(`[Reddit] Forbidden (403) for ${url}, trying next source...`);
        return null;
      }
      
      if (!res.ok) {
        console.warn(`[Reddit] ${res.status} for ${url}`);
        return null;
      }
      
      return res;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[Reddit] Timeout for ${url}, attempt ${attempt + 1}/${retries}`);
      }
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
  // Simple XML parsing for Atom entries
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

/**
 * Try fetching Reddit data via RSS feed (most reliable on Vercel)
 */
async function fetchRedditRSS(subreddit, keyword) {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.rss?q=${query}&sort=new&restrict_sr=on&t=month`
    : `https://www.reddit.com/search.rss?q=${query}&sort=new&t=month&limit=50`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  const text = await res.text();
  const posts = parseRSSFeed(text);
  console.log(`[Reddit RSS] ${subreddit || 'global'} + "${keyword}": ${posts.length} posts`);
  return posts;
}

/**
 * Try fetching Reddit data via old.reddit.com JSON (fallback)
 */
async function fetchOldRedditJSON(subreddit, keyword, limit = 25) {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://old.reddit.com/r/${subreddit}/search.json?q=${query}&sort=new&restrict_sr=on&t=month&limit=${limit}`
    : `https://old.reddit.com/search.json?q=${query}&sort=new&t=all&limit=${limit}`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  try {
    const data = await res.json();
    const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);
    console.log(`[Reddit JSON] ${subreddit || 'global'} + "${keyword}": ${posts.length} posts`);
    return posts;
  } catch {
    return [];
  }
}

/**
 * Try fetching from www.reddit.com JSON (original, least reliable on Vercel)
 */
async function fetchRedditJSON(subreddit, keyword, limit = 25) {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&sort=new&restrict_sr=on&t=month&limit=${limit}`
    : `https://www.reddit.com/search.json?q=${query}&sort=new&t=all&limit=${limit}`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  try {
    const data = await res.json();
    const posts = (data?.data?.children || []).map(c => c.data).filter(Boolean);
    console.log(`[Reddit WWW] ${subreddit || 'global'} + "${keyword}": ${posts.length} posts`);
    return posts;
  } catch {
    return [];
  }
}

/**
 * Multi-fallback Reddit fetch: RSS → old.reddit → www.reddit
 */
async function fetchRedditPosts(subreddit, keyword, limit = 25) {
  // Strategy 1: RSS (most reliable on Vercel)
  let posts = await fetchRedditRSS(subreddit, keyword);
  if (posts.length > 0) return posts;
  
  await delay(500);
  
  // Strategy 2: old.reddit.com JSON
  posts = await fetchOldRedditJSON(subreddit, keyword, limit);
  if (posts.length > 0) return posts;
  
  await delay(500);
  
  // Strategy 3: www.reddit.com JSON (least likely to work on Vercel)
  posts = await fetchRedditJSON(subreddit, keyword, limit);
  return posts;
}

export async function runSocialExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Social] Starting multi-fallback Reddit extraction...');
  const leads = [];
  const leadsMap = new Map();
  
  const searchKeywords = intentData.keywords.slice(0, 5);
  const subreddits = intentData.subreddits || [];
  
  // 1. Targeted Subreddit Search (Highest Intent)
  for (const sub of subreddits.slice(0, 5)) {
    for (const keyword of searchKeywords.slice(0, 3)) {
      const posts = await fetchRedditPosts(sub, keyword);
      
      for (const p of posts) {
        if (!p || leadsMap.has(p.id)) continue;
        processPost(p, sub);
      }
      
      await delay(300);
    }
  }
  
  // 2. Global Keyword Search
  for (const keyword of searchKeywords) {
    const posts = await fetchRedditPosts(null, keyword, options.isPremium ? 50 : 30);
    
    for (const p of posts) {
      if (!p || leadsMap.has(p.id)) continue;
      processPost(p);
    }
    
    await delay(500);
  }
  
  // 3. Direct Goal Fallback
  const goalQuery = intentData.searchIntent || '';
  if (goalQuery && goalQuery !== searchKeywords[0]) {
    const posts = await fetchRedditPosts(null, goalQuery, 25);
    
    for (const p of posts) {
      if (!p || leadsMap.has(p.id)) continue;
      processPost(p);
    }
  }
  
  function processPost(p, fallbackSubreddit) {
    const title = p.title || '';
    const selftext = p.selftext || '';
    const author = p.author;
    const subreddit = p.subreddit || fallbackSubreddit || 'unknown';
    
    // Build permalink
    let url;
    if (p.permalink && p.permalink.startsWith('http')) {
      url = p.permalink;
    } else if (p.permalink) {
      url = `https://reddit.com${p.permalink}`;
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
