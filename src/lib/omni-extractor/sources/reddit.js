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
  const searchKeywords = intentData.keywords.slice(0, 3);
  const limit = options.isPremium ? 100 : 50; // Increased base limit
  
  try {
    for (const keyword of searchKeywords) {
      // 1. Search for NEW posts (fresh intent)
      // 2. Search for RELEVANCE posts from the last MONTH (broader intent)
      const searchTypes = [
        { sort: 'new', t: 'all' },
        { sort: 'relevance', t: 'month' }
      ];

      for (const st of searchTypes) {
        const query = encodeURIComponent(keyword);
        const url = `https://www.reddit.com/search.json?q=${query}&sort=${st.sort}&t=${st.t}&limit=${Math.floor(limit/2)}`;
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          }
        });

        if (!res.ok) continue;
        const data = await res.json();
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const p = post.data;
          if (!p || leadsMap.has(p.id)) continue;

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
              link: url,
              context: context,
              raw_contacts: contacts
            };
            leadsMap.set(p.id, lead);
            leads.push(lead);
          }
        }
        // Small delay between keyword/sort searches
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (error) {
    console.error('[Omni-Source: Social] Error:', error.message);
  }

  return leads;
}
