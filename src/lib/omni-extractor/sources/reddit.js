/**
 * Omni-Extractor — Reddit & Community Module
 * Extracts high-intent B2C users asking for recommendations.
 */

import { detectContactsAggressively } from '../detector.js';

export async function runSocialExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Social] Starting aggressive Reddit extraction...');
  const leads = [];
  const leadsMap = new Map(); // Prevent duplicates across keyword searches
  
  // Use multiple keywords for broader reach
  const searchKeywords = intentData.keywords.slice(0, 5);
  const limit = options.isPremium ? 100 : 60; 
  
  try {
    const subreddits = intentData.subreddits || [];
    
    // 1. Targeted Subreddit Search (Highest Intent)
    for (const sub of subreddits.slice(0, 5)) {
      for (const keyword of searchKeywords) {
        const query = encodeURIComponent(keyword);
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${query}&sort=new&restrict_sr=on&t=month&limit=25`;
        
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
          cache: 'no-store'
        });

        if (!res.ok) continue;
        const data = await res.json();
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const p = post.data;
          if (!p || leadsMap.has(p.id)) continue;
          processPost(p);
        }
      }
    }

    // 2. Global Keyword Search
    for (const keyword of searchKeywords) {
      const searchTypes = [
        { sort: 'new', t: 'all' },
        { sort: 'relevance', t: 'month' }
      ];

      for (const st of searchTypes) {
        const query = encodeURIComponent(keyword);
        const url = `https://www.reddit.com/search.json?q=${query}&sort=${st.sort}&t=${st.t}&limit=${Math.floor(limit/2)}`;
        
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
          cache: 'no-store'
        });

        if (!res.ok) continue;
        const data = await res.json();
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const p = post.data;
          if (!p || leadsMap.has(p.id)) continue;
          processPost(p);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 3. Direct Goal Fallback (Ensures high-yield discovery)
    const goalQuery = encodeURIComponent(intentData.searchIntent || '');
    if (goalQuery) {
      const url = `https://www.reddit.com/search.json?q=${goalQuery}&sort=relevance&t=all&limit=25`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const posts = data?.data?.children || [];
        for (const post of posts) {
          if (!post.data || leadsMap.has(post.data.id)) continue;
          processPost(post.data);
        }
      }
    }
    
    function processPost(p) {
      const title = p.title || '';
      const selftext = p.selftext || '';
      const author = p.author;
      const url = `https://reddit.com${p.permalink}`;
      
      const context = title + '\n' + selftext;
      const contacts = detectContactsAggressively(context);
      
      if (!contacts.socials.includes(`reddit:@${author}`)) {
        contacts.socials.push(`reddit:@${author}`);
      }

      if (author && author !== '[deleted]' && author !== 'AutoModerator') {
        const lead = {
          source: 'reddit',
          subreddit: p.subreddit,
          link: url,
          context: context,
          raw_contacts: contacts
        };
        leadsMap.set(p.id, lead);
        leads.push(lead);
      }
    }
  } catch (error) {
    console.error('[Omni-Source: Social] Error:', error.message);
  }

  return leads;
}
