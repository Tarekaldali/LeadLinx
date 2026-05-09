/**
 * Omni-Extractor — Reddit & Community Module
 * Extracts high-intent B2C users asking for recommendations.
 */

import { detectContactsAggressively } from '../detector.js';

export async function runSocialExtraction(intentData, options = {}) {
  console.log('[Omni-Source: Social] Starting Reddit extraction for:', intentData.keywords);
  const leads = [];
  
  const query = encodeURIComponent(intentData.keywords[0]);
  const limit = options.isPremium ? 100 : 25;
  const url = `https://www.reddit.com/search.json?q=${query}&sort=new&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (OmniExtractor/1.0)',
      }
    });

    if (!res.ok) throw new Error(`Reddit API failed: ${res.status}`);
    const data = await res.json();
    
    const posts = data?.data?.children || [];

    for (const post of posts) {
      const p = post.data;
      if (!p) continue;

      const title = p.title || '';
      const selftext = p.selftext || '';
      const author = p.author;
      const url = `https://reddit.com${p.permalink}`;
      
      const context = title + '\n' + selftext;
      const contacts = detectContactsAggressively(context);
      
      // For Reddit, even if they didn't leave an email, their Reddit handle is a contact!
      if (!contacts.socials.includes(`reddit:@${author}`)) {
        contacts.socials.push(`reddit:@${author}`);
      }

      // We filter out deleted/auto-moderator accounts
      if (author && author !== '[deleted]' && author !== 'AutoModerator') {
        leads.push({
          source: 'reddit',
          link: url,
          context: context,
          raw_contacts: contacts
        });
      }
    }

  } catch (error) {
    console.error('[Omni-Source: Social] Error:', error.message);
  }

  return leads;
}
