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
  return new Promise(r => setTimeout(r, ms + Math.random() * 200));
}

async function runWithConcurrency(items, limit, worker) {
  const executing = new Set();
  const results = [];

  for (const item of items) {
    const promise = Promise.resolve().then(() => worker(item));
    results.push(promise);
    executing.add(promise);
    promise.finally(() => executing.delete(promise));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

function uniqueClean(items) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .map(item => String(item).trim())
    .filter(item => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getFallbackSubreddits(intentData) {
  const text = [
    intentData.searchIntent,
    ...(intentData.keywords || []),
    ...(intentData.searchQueries || []),
  ].join(' ').toLowerCase();

  if (/(skin\s*care|skincare|acne|beauty|moisturizer|sunscreen|retinol|serum)/i.test(text)) {
    return ['SkincareAddiction', 'AsianBeauty', '30PlusSkinCare', 'acne', 'beauty', 'Sephora', 'Ulta', 'tretinoin'];
  }

  if (/(fitness|gym|workout|weight loss|protein|supplement)/i.test(text)) {
    return ['fitness', 'loseit', 'xxfitness', 'bodyweightfitness', 'nutrition', 'Supplements'];
  }

  if (/(crm|sales|lead|pipeline|cold email)/i.test(text)) {
    return ['sales', 'smallbusiness', 'Entrepreneur', 'SaaS', 'startups', 'salesforce'];
  }

  if (/(shopify|ecommerce|store|dropship)/i.test(text)) {
    return ['shopify', 'ecommerce', 'Entrepreneur', 'smallbusiness', 'dropshipping', 'AmazonFBA'];
  }

  return ['AskReddit', 'NoStupidQuestions', 'BuyItForLife', 'Productivity', 'Entrepreneur', 'smallbusiness'];
}

function expandBuyerQueries(intentData) {
  const base = uniqueClean([
    ...(intentData.searchQueries || []),
    ...(intentData.keywords || []),
    intentData.searchIntent,
  ]);
  const intent = intentData.searchIntent || base[0] || '';
  const compactIntent = intent
    .replace(/\b(people|users|customers|leads|actively|looking|buy|purchase|want|need|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const target = compactIntent || intent;

  return uniqueClean([
    ...base,
    target,
    `looking for ${target}`,
    `recommend ${target}`,
    `best ${target}`,
    `need help with ${target}`,
    `where to buy ${target}`,
    `alternative to ${target}`,
  ]);
}

/**
 * Fetch with retry and timeout using native global fetch
 */
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      // 5s timeout — tight but leaves budget for validation
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': getUA(),
          'Accept': 'application/json,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      if (res.status === 429) {
        console.warn(`[Reddit] Rate limited (429), waiting 1s...`);
        await delay(1000); // flat 1s — don't blow the time budget
        continue;
      }
      
      if (res.status === 403) {
        console.warn(`[Reddit] Forbidden (403) for ${url}`);
        return null;
      }
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      return res;
    } catch (err) {
      console.warn(`[Reddit] Fetch error attempt ${attempt + 1}: ${err.message}`);
      if (attempt === retries - 1) return null;
      await delay(300);
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
      
      let content = (contentMatch?.[1] || '')
        // Decode common HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#32;/g, ' ')
        // Remove common Reddit RSS footer text
        .replace(/submitted by\s*<a[^>]*>.*?<\/a>/gi, '')
        .replace(/\[link\]/gi, '')
        .replace(/\[comments\]/gi, '')
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
        
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

function normalizeRedditPost(p, resultType = 'link') {
  const id = p.name || p.id || p.permalink || p.link_permalink;
  return {
    ...p,
    id,
    title: p.title || p.link_title || '',
    selftext: p.selftext || p.body || '',
    permalink: p.permalink || p.link_permalink || '',
    resultType,
  };
}

async function fetchRedditJSON(subreddit, keyword, limit = 100, sort = 'new', type = 'link') {
  const query = encodeURIComponent(keyword);
  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&sort=${sort}&restrict_sr=on&t=year&limit=${limit}&type=${type}&raw_json=1`
    : `https://www.reddit.com/search.json?q=${query}&sort=${sort}&t=year&limit=${limit}&type=${type}&raw_json=1`;
  
  const res = await fetchWithRetry(url);
  if (!res) return [];
  
  try {
    const data = await res.json();
    const posts = (data?.data?.children || [])
      .map(c => c.data)
      .filter(Boolean)
      .map(p => normalizeRedditPost(p, type));
    console.log(`[Reddit JSON] ${subreddit || 'global'} + "${keyword}" (${sort}/${type}): ${posts.length} posts`);
    return posts;
  } catch {
    return [];
  }
}

async function fetchRedditPosts(subreddit, keyword, limit = 50) {
  const allPosts = new Map();
  
  // Run NEW and RELEVANCE in PARALLEL — half the time cost
  const [newPosts, relevantPosts, commentPosts] = await Promise.all([
    fetchRedditJSON(subreddit, keyword, limit, 'new', 'link'),
    fetchRedditJSON(subreddit, keyword, limit, 'relevance', 'link'),
    fetchRedditJSON(subreddit, keyword, Math.min(limit, 50), 'relevance', 'comment'),
  ]);
  
  newPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  relevantPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  commentPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  
  // Only fall back to RSS if we got nothing at all
  if (allPosts.size === 0) {
    const rssPosts = await fetchRedditRSS(subreddit, keyword);
    rssPosts.forEach(p => { if (p && p.id) allPosts.set(p.id, p); });
  }
  
  return Array.from(allPosts.values());
}

export async function runSocialExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Social] Starting Reddit extraction...');
  const leads = [];
  const leadsMap = new Map();
  
  const EXTRACTION_DEADLINE = Date.now() + (options.extractionMs || 90000);
  const withinBudget = () => Date.now() < EXTRACTION_DEADLINE;

  const searchKeywords = expandBuyerQueries(intentData).slice(0, options.isPremium ? 10 : 8);
  const subreddits = uniqueClean([...(intentData.subreddits || []), ...getFallbackSubreddits(intentData)]).slice(0, options.isPremium ? 12 : 10);
  
  // Phase 1: Subreddit-specific searches — all in parallel (no chunking)
  const combinations = [];
  for (const sub of subreddits) {
    for (const keyword of searchKeywords) {
      combinations.push({ sub, keyword });
    }
  }

  await runWithConcurrency(combinations, options.isPremium ? 10 : 8, async ({ sub, keyword }) => {
    if (!withinBudget()) return;
    try {
      const posts = await fetchRedditPosts(sub, keyword, options.isPremium ? 100 : 75);
      for (const p of posts) {
        if (!p || leadsMap.has(p.id)) continue;
        processPost(p, sub);
      }
    } catch (err) {
      console.error(`[Reddit] Failed for ${sub} + ${keyword}:`, err.message);
    }
  });
  
  // Phase 2: Global keyword searches — also all in PARALLEL
  if (withinBudget()) {
    await runWithConcurrency(searchKeywords, options.isPremium ? 6 : 4, async (keyword) => {
      if (!withinBudget()) return;
      try {
        const posts = await fetchRedditPosts(null, keyword, options.isPremium ? 100 : 75);
        for (const p of posts) {
          if (!p || leadsMap.has(p.id)) continue;
          processPost(p);
        }
      } catch (err) {
        console.error(`[Reddit] Global search failed for "${keyword}":`, err.message);
      }
    });
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
