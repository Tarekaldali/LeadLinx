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
      id: child.data.id,
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
 * Fetches posts from up to 20 subreddits, looking back 2 months.
 * Reads new + hot + top(month) feeds, 100 posts each → hundreds of posts per subreddit.
 */
export async function fetchRedditPosts(subreddits, keywords, negativeKeywords = []) {
  const allPosts = new Map();
  const nowSec = Date.now() / 1000;

  // Cap at 20 subreddits
  const targetSubs = subreddits.slice(0, 20);

  // Feeds: new, hot, top-month — 100 posts per feed for maximum coverage
  const feedConfigs = [
    { feed: 'new',  suffix: '?limit=100' },
    { feed: 'hot',  suffix: '?limit=100' },
    { feed: 'top',  suffix: '?sort=top&t=month&limit=100' },
  ];

  const feedPromises = [];
  for (const sub of targetSubs) {
    const s = sub.trim();
    if (!s) continue;
    for (const { feed, suffix } of feedConfigs) {
      const url = `https://www.reddit.com/r/${s}/${feed}.json${suffix}`;
      feedPromises.push(
        fetchWithRetry(url)
          .then(data => parsePosts(data))
          .catch(err => {
            console.warn(`⚠ r/${s}/${feed}: ${err.message}`);
            return [];
          })
      );
    }
  }

  // Run all fetches in parallel
  const results = await Promise.all(feedPromises);
  for (const posts of results) {
    for (const post of posts) {
      if (!allPosts.has(post.id)) {
        allPosts.set(post.id, post);
      }
    }
  }

  const allPostsArray = Array.from(allPosts.values());
  console.log(`📦 Total unique posts fetched: ${allPostsArray.length} from ${targetSubs.length} subreddits`);

  // Filter: only posts from last 2 months (no stale content)
  const recentPosts = allPostsArray.filter(p => (nowSec - p.created) <= TWO_MONTHS_SECS);
  console.log(`📅 Posts within 2 months: ${recentPosts.length}`);

  // Filter out negative keywords
  const lowerNeg = negativeKeywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  let filtered = recentPosts.filter(post => {
    const content = `${post.title} ${post.text}`.toLowerCase();
    return !lowerNeg.some(nk => content.includes(nk));
  });

  // Keyword matching
  const lowerKws = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  const keywordMatched = filtered.filter(post =>
    matchesKeywords(`${post.title} ${post.text}`, lowerKws)
  );

  const addEngagement = posts => posts.map(p => ({
    ...p,
    engagementScore: calcEngagement(p),
  }));

  // Use keyword-matched posts if we have enough; otherwise fall back to all recent
  if (keywordMatched.length >= 5) {
    const ranked = addEngagement(keywordMatched).sort((a, b) => b.engagementScore - a.engagementScore);
    console.log(`✅ Keyword matched: ${ranked.length} posts`);
    return ranked;
  }

  // Fallback: all recent posts sorted by engagement — AI will do intent filtering
  console.log(`⚡ Fallback to all ${filtered.length} recent posts for AI scoring`);
  return addEngagement(filtered).sort((a, b) => b.engagementScore - a.engagementScore);
}
