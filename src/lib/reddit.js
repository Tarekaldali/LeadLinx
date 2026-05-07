const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1500 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

function parsePosts(data) {
  if (!data?.data?.children) return [];
  return data.data.children
    .filter(child => child.kind === 't3')
    .map(child => ({
      postId: child.data.id,
      title: child.data.title || '',
      text: child.data.selftext || '',
      link: `https://reddit.com${child.data.permalink}`,
      author: child.data.author,
      subreddit: child.data.subreddit,
      created: child.data.created_utc,
      score: child.data.score,
      numComments: child.data.num_comments,
      upvoteRatio: child.data.upvote_ratio || 0,
    }));
}

// Age in hours
function getAgeHours(post) {
  return (Date.now() / 1000 - post.created) / 3600;
}

// Engagement score — fresher posts with more interaction rank higher
function calcEngagement(post) {
  const ageHours = Math.max(1, getAgeHours(post));
  const interactionScore = (post.score || 0) + (post.numComments || 0) * 2;
  return interactionScore / Math.pow(ageHours, 0.4);
}

// Two months in seconds
const TWO_MONTHS_SECS = 60 * 24 * 3600;

function matchesKeywords(content, keywords) {
  const lower = content.toLowerCase();
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase().trim();
    if (!kwLower) continue;
    const words = kwLower.split(/\s+/);
    if (words.length > 1) {
      if (words.every(word => lower.includes(word))) return true;
    } else {
      if (lower.includes(kwLower)) return true;
    }
  }
  return false;
}

/**
 * Fetches posts using Reddit's internal Search API to support Boolean logic.
 */
export async function fetchRedditPosts(subreddits, searchQueries) {
  const allPosts = new Map();
  const nowSec = Date.now() / 1000;

  const safeSubs = Array.isArray(subreddits) ? subreddits : [];
  
  // SANITIZE: Remove r/ prefix, whitespace, and limit to 10 subreddits to avoid 404/URL length issues
  const sanitizedSubs = safeSubs
    .map(s => s.trim().replace(/^r\//, ''))
    .filter(s => s.length > 0)
    .slice(0, 10); 

  const subsString = sanitizedSubs.join('+');
  const queries = Array.isArray(searchQueries) ? searchQueries : [searchQueries];

  const searchPromises = [];
  
  // Strategy: For each strategic query, search across the combined subreddit pool
  for (const q of queries) {
    if (!q) continue;
    
  // Chunk subreddits into groups of 5 to avoid long URL issues
  const subChunks = [];
  for (let i = 0; i < sanitizedSubs.length; i += 5) {
    subChunks.push(sanitizedSubs.slice(i, i + 5).join('+'));
  }
  // Add an empty string to represent "All of Reddit" search
  subChunks.push(''); 

  const queries = Array.isArray(searchQueries) ? [...searchQueries] : [searchQueries];
  
  // Add a simplified fallback query to ensure we don't return 0 posts
  const fallback = queries[0].split(' ').slice(0, 3).join(' ');
  if (!queries.includes(fallback)) queries.push(fallback);

  const searchPromises = [];

  const searchTypes = [
    { sort: 'relevance', t: 'month' },
    { sort: 'new',       t: 'all' },
    { sort: 'top',       t: 'year' }
  ];
  
  for (const q of queries) {
    if (!q) continue;
    const encodedQuery = encodeURIComponent(q);

    for (const subsString of subChunks) {
      for (const { sort, t } of searchTypes) {
        const url = subsString 
          ? `https://www.reddit.com/r/${subsString}/search.json?q=${encodedQuery}&restrict_sr=on&sort=${sort}&t=${t}&limit=100`
          : `https://www.reddit.com/search.json?q=${encodedQuery}&sort=${sort}&t=${t}&limit=100`;

        searchPromises.push(
          fetchWithRetry(url)
            .then(data => parsePosts(data))
            .catch(() => [])
        );
      }
    }
  }
  }

  const results = await Promise.all(searchPromises);
  for (const posts of results) {
    for (const post of posts) {
      if (!allPosts.has(post.id)) {
        allPosts.set(post.id, post);
      }
    }
  }

  const allPostsArray = Array.from(allPosts.values());
  console.log(`📦 Strategic Fetch: Found ${allPostsArray.length} unique posts matching Boolean queries.`);

  // Filter: only posts from last 3 months (Search can be broader)
  const THREE_MONTHS_SECS = 90 * 24 * 3600;
  const filtered = allPostsArray.filter(p => (nowSec - p.created) <= THREE_MONTHS_SECS);

  const addEngagement = posts => posts.map(p => ({
    ...p,
    engagementScore: calcEngagement(p),
  }));

  // Sort by engagement and return
  const ranked = addEngagement(filtered).sort((a, b) => b.engagementScore - a.engagementScore);
  console.log(`✅ Strategic Leads Filtered: ${ranked.length} posts ready for AI analysis.`);
  
  return ranked;
}
