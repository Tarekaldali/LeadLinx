import { callGemini, callOpenRouter, calcCost } from './gemini';
import fs from 'fs';
function dbg(msg) {
  console.log(msg);
}

/**
 * Lead Generation Engine - V3 (Parallel Processing & Pagination Loop)
 * Handles Reddit scraping, deduplication, and AI scoring based on Plan limits.
 */

const DELAY = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch data from Reddit via JSON endpoint with Pagination
 */
async function fetchRedditPage(subreddit, keyword, after = null) {
  let url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new&limit=100`;
  if (after) url += `&after=${after}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 LeadLinx/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Reddit API] Fetch failed for ${subreddit} (${response.status})`);
      return { posts: [], after: null };
    }

    const data = await response.json();
    const children = data?.data?.children || [];
    const nextAfter = data?.data?.after || null;

    // Minification
    const posts = children.map(child => ({
      name: child.data.name,
      title: child.data.title,
      selftext: child.data.selftext,
      url: `https://reddit.com${child.data.permalink}`,
      subreddit: child.data.subreddit,
      score: child.data.score || 0,
      numComments: child.data.num_comments || 0,
      createdAt: child.data.created_utc ? new Date(child.data.created_utc * 1000).toISOString() : new Date().toISOString()
    }));

    return { posts, after: nextAfter };
  } catch (error) {
    console.error(`[Reddit API] Error fetching ${subreddit}:`, error.message);
    return { posts: [], after: null };
  }
}

/**
 * Strict AI Prompt combining User's Advanced Arabic Rules & JSON Enforcement
 */
const AI_PROMPT = (serviceOrProduct) => `أنت خبير متقدم في تحليل البيانات واكتشاف العملاء المحتملين (Lead Generation Expert).
سأزودك بمصفوفة بيانات بصيغة JSON تحتوي على منشورات من موقع Reddit.

مهمتك:
تحليل كل منشور بدقة لمعرفة ما إذا كان الكاتب يمثل "عميلاً محتملاً" مهتماً بـ [${serviceOrProduct}].

معايير اختيار العميل المحتمل (Lead) الصارمة:
1. يعاني من مشكلة يحلها المنتج/الخدمة الخاصة بي.
2. يبحث بنشاط عن توصيات أو أدوات لحل مشكلته.
3. يعبر عن استيائه أو إحباطه من أداة منافسة يستخدمها حالياً.

تعليمات الإخراج (قيود نظام صارمة جداً - System Instructions):
1. يجب أن تقيّم "نية الشراء" (Buyer Intent).
2. الإخراج حصراً بصيغة JSON Array بهذا الهيكل بالضبط: 
[{"post_id": "name", "is_lead": boolean, "reason": "15 words max explaining the pain point", "urgency": "High/Medium/Low/None"}]
لا تضف أي نص خارج الأقواس، ولا تستخدم علامات Markdown (\`\`\`json).`;

/**
 * Batch analysis with fail-safes and token tracking
 */
async function analyzeBatch(posts, serviceOrProduct, provider = 'gemini') {
  if (posts.length === 0) return { results: [], inTokens: 0, outTokens: 0 };

  const payload = posts.map(p => ({ post_id: p.name, title: p.title, text: p.selftext.substring(0, 300) }));
  
  const messages = [
    { role: 'system', content: AI_PROMPT(serviceOrProduct) },
    { role: 'user', content: JSON.stringify(payload) }
  ];

  try {
    const res = await callGemini(messages, { temperature: 0.1 }); 
    const resultText = res.text;
    const inTokens = res.inputTokens;
    const outTokens = res.outputTokens;

    const cleanJson = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return { results: Array.isArray(parsed) ? parsed : [], inTokens, outTokens };
  } catch (error) {
    console.error(`[AI Analysis] Failed:`, error.message);
    return { results: [], inTokens: 0, outTokens: 0 };
  }
}

/**
 * Core loop Engine
 */
export async function runLeadGenerationLoop(subreddits, keyword, targetLeads) {
  let allFoundLeads = [];
  let checkedPostsDB = new Set(); 
  let subredditCursors = subreddits.reduce((acc, sub) => ({ ...acc, [sub]: null }), {});
  let activeSubreddits = [...subreddits].slice(0, 12); 

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let totalPostsScanned = 0;

  dbg(`🚀 Starting V3 Engine for: "${keyword}" | Target: ${targetLeads}`);

  while (allFoundLeads.length < targetLeads && activeSubreddits.length > 0) {
    const sub = activeSubreddits.shift(); // take the first subreddit
    if (!sub) break;

    dbg(`⬇️ Fetching reddit page for: ${sub}`);
    const after = subredditCursors[sub];
    const { posts, after: newAfter } = await fetchRedditPage(sub, keyword, after);
      
    // Wait a little before the next potential fetch
    const sleepTime = Math.floor(Math.random() * 1000) + 1000;
    await DELAY(sleepTime);

    if (newAfter) {
      subredditCursors[sub] = newAfter;
      activeSubreddits.push(sub); // put it back at the end of the queue for round-robin
    }

    // Deduplication
    let rawPostsBatch = [];
    for (const p of posts) {
      if (!checkedPostsDB.has(p.name)) {
        checkedPostsDB.add(p.name);
        rawPostsBatch.push(p);
        totalPostsScanned++;
      }
    }
    dbg(`  📥 Pulled ${posts.length} posts. Active unique batch size: ${rawPostsBatch.length}`);

    if (rawPostsBatch.length === 0) continue;

    // Process THIS subreddit's valid posts in batches
    for (let i = 0; i < rawPostsBatch.length; i += 20) {
      if (allFoundLeads.length >= targetLeads) break;

      const batch20 = rawPostsBatch.slice(i, i + 20);
      const batchGemini = batch20.slice(0, 10);
      const batchOpenRouter = batch20.slice(10, 20);

      dbg(`🧠 Parallel analyzing ${batch20.length} posts...`);

      const [resG, resO] = await Promise.all([
        analyzeBatch(batchGemini, keyword, 'gemini'),
        analyzeBatch(batchOpenRouter, keyword, 'openrouter')
      ]);

      totalInputTokens += resG.inTokens + resO.inTokens;
      totalOutputTokens += resG.outTokens + resO.outTokens;

      const combinedResults = [...resG.results, ...resO.results];

      // Map to UI expectations
      const positiveLeads = combinedResults
        .filter(res => res.is_lead === true)
        .map(res => {
          const originalPost = batch20.find(p => p.name === res.post_id);
          if (!originalPost) return null;
          
          let score = 7;
          if (res.urgency === 'High') score = 9;
          if (res.urgency === 'Medium') score = 8;

          return {
            ...originalPost,
            intentScore: score,
            intentReason: res.reason,
            urgency: res.urgency === 'None' ? 'low' : res.urgency?.toLowerCase(),
            painPoint: res.reason,
            badge: score >= 9 ? 'hot' : 'opportunity',
            replyAngle: 'Reach out emphasizing how your service solves their exact frustration.',
            scoredBy: 'V3-Engine'
          };
        })
        .filter(Boolean);

      allFoundLeads.push(...positiveLeads);
      dbg(`✅ Found ${positiveLeads.length} leads. (Total: ${allFoundLeads.length}/${targetLeads})`);
      
      // Delay slightly between parallel API batches to respect free tier rate limits
      await DELAY(2500);
    }
  }

  return {
    leads: allFoundLeads.slice(0, targetLeads),
    costInfo: calcCost(totalInputTokens, totalOutputTokens),
    totalPostsScanned
  };
}
