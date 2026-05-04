const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

async function callGeminiJSON(systemPrompt, userPrompt) {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.status === 429) {
          const waitMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        if (!res.ok) {
          lastError = new Error(`Gemini error: ${res.status}`);
          break;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return JSON.parse(text);
      } catch (err) {
        lastError = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('All query expansion attempts failed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated buyer-intent fallback map: maps product types → subreddits where
// ACTUAL BUYERS / POTENTIAL CUSTOMERS of that product hang out.
// NOT "topic" communities — BUYER communities.
// ─────────────────────────────────────────────────────────────────────────────
const BUYER_INTENT_MAP = {
  ai_image: [
    'StableDiffusion', 'midjourney', 'aiArt', 'generativeAI',
    'AIDiscussion', 'comfyui', 'AIGirlfriendsReviews', 'ChatGPT',
    'artificial', 'learnmachinelearning',
  ],
  ai_writing: [
    'ChatGPT', 'artificial', 'AIAssistants', 'copywriting',
    'marketing', 'Blogging', 'content_marketing', 'freelanceWriters',
  ],
  ai_tools: [
    'ChatGPT', 'artificial', 'singularity', 'MachineLearning',
    'AIDiscussion', 'productivity', 'SaaS', 'startups',
  ],
  saas_b2b: [
    'sales', 'SaaS', 'smallbusiness', 'entrepreneur',
    'startups', 'Entrepreneur', 'microsaas', 'Indiehackers',
  ],
  ecommerce: [
    'ecommerce', 'shopify', 'dropshipping', 'Entrepreneur',
    'smallbusiness', 'AmazonFBA', 'FulfillmentByAmazon',
  ],
  crm_sales: [
    'sales', 'salestechniques', 'sales_advice', 'smallbusiness',
    'entrepreneur', 'SaaS', 'CRM',
  ],
  marketing: [
    'marketing', 'digital_marketing', 'socialmedia', 'SEO',
    'PPC', 'content_marketing', 'entrepreneur',
  ],
  design: [
    'graphic_design', 'web_design', 'UI_Design', 'UXDesign',
    'logodesign', 'freelance', 'design',
  ],
  video_editing: [
    'editors', 'VideoEditing', 'premiere', 'AfterEffects',
    'filmmakers', 'NewTubers', 'youtube',
  ],
  social_media: [
    'socialmedia', 'Instagram', 'TikTokTips', 'NewTubers',
    'youtube', 'marketing', 'Entrepreneur',
  ],
  productivity: [
    'productivity', 'nocode', 'Notion', 'projectmanagement',
    'remotework', 'entrepreneur', 'getdisciplined',
  ],
  development: [
    'webdev', 'programming', 'learnprogramming', 'SideProject',
    'startups', 'node', 'reactjs',
  ],
  default: [
    'SaaS', 'entrepreneur', 'smallbusiness', 'startups',
    'Entrepreneur', 'microsaas',
  ],
};

/**
 * AI selects the best subreddits WHERE POTENTIAL BUYERS of this product hang out.
 * Focus: buyer communities, not topic communities.
 */
export async function selectSubreddits(userQuery) {
  try {
    const result = await callGeminiJSON(
      `You are a Reddit growth expert who specializes in finding BUYER communities.
Your job is NOT to find subreddits about the topic — your job is to find subreddits where POTENTIAL CUSTOMERS who would PAY FOR this product are actively posting.

CRITICAL RULE: Think like a salesperson. Where do the BUYERS hang out? Not where experts discuss the topic — where do people who NEED this solution spend time?`,

      `Product/Service description: "${userQuery}"

Find 5-7 subreddits where POTENTIAL BUYERS of this product/service are actively posting.

BUYER-FIRST thinking:
- Who would PAY for this? What problems do they have?
- Where do those people hang out on Reddit?
- Look for: communities where people share pain points, ask for recommendations, or discuss alternatives

EXAMPLES of correct buyer-focused selection:
- AI image generator tool → buyers are in: [StableDiffusion, midjourney, aiArt, generativeAI, comfyui, AIDiscussion, artificial]
  (NOT in: MachineLearning, programming — those are experts, not buyers)
- CRM software → buyers are in: [sales, smallbusiness, entrepreneur, salestechniques, Entrepreneur]
  (NOT in: SaaS, startups — those are builders, not buyers)
- Video editing AI → buyers are in: [VideoEditing, NewTubers, youtube, filmmakers, premiere]
  (NOT in: programming, MachineLearning)
- Social media scheduler → buyers are in: [socialmedia, Instagram, marketing, Entrepreneur, smallbusiness]

Return ONLY buyer communities. Prefer subreddits with 50k+ members where people post about their PROBLEMS.

Return JSON: {"subreddits": ["name1", "name2", ...], "buyer_profile": "who will buy this and why"}`
    );

    const subs = Array.isArray(result?.subreddits) ? result.subreddits : [];
    const filtered = subs
      .filter(s => typeof s === 'string' && s.length > 1 && s.length < 60)
      .slice(0, 8);

    if (filtered.length >= 3) {
      console.log(`🎯 Buyer subreddits for "${userQuery}":`, filtered);
      console.log(`   Buyer profile: ${result?.buyer_profile}`);
      return filtered;
    }

    return getFallbackSubreddits(userQuery);
  } catch (error) {
    console.error('Subreddit selection failed, using fallback:', error.message);
    return getFallbackSubreddits(userQuery);
  }
}

function getFallbackSubreddits(query) {
  const q = query.toLowerCase();
  // AI image / art tools
  if (q.includes('image') || q.includes('ai art') || q.includes('ai photo') ||
      q.includes('stable diffusion') || q.includes('midjourney') || q.includes('dall-e') ||
      q.includes('picture') || q.includes('photo') || q.includes('generate image'))
    return BUYER_INTENT_MAP.ai_image;
  // AI writing
  if (q.includes('write') || q.includes('content') || q.includes('copy') ||
      q.includes('blog') || q.includes('article') || q.includes('text'))
    return BUYER_INTENT_MAP.ai_writing;
  // General AI tools
  if (q.includes(' ai ') || q.includes('artificial intelligence') || q.includes('chatgpt') ||
      q.includes('llm') || q.includes('ai tool'))
    return BUYER_INTENT_MAP.ai_tools;
  // Ecommerce
  if (q.includes('shop') || q.includes('ecommerce') || q.includes('store') ||
      q.includes('sell') || q.includes('product') || q.includes('amazon'))
    return BUYER_INTENT_MAP.ecommerce;
  // CRM / Sales
  if (q.includes('crm') || q.includes('sales') || q.includes('pipeline') ||
      q.includes('lead') || q.includes('prospect'))
    return BUYER_INTENT_MAP.crm_sales;
  // Marketing
  if (q.includes('market') || q.includes('ads') || q.includes('seo') ||
      q.includes('social media') || q.includes('campaign'))
    return BUYER_INTENT_MAP.marketing;
  // Design
  if (q.includes('design') || q.includes('figma') || q.includes('logo') ||
      q.includes('ui') || q.includes('ux') || q.includes('graphic'))
    return BUYER_INTENT_MAP.design;
  // Video
  if (q.includes('video') || q.includes('edit') || q.includes('youtube') ||
      q.includes('film') || q.includes('clip'))
    return BUYER_INTENT_MAP.video_editing;
  // Social
  if (q.includes('instagram') || q.includes('tiktok') || q.includes('twitter') ||
      q.includes('social') || q.includes('post') || q.includes('creator'))
    return BUYER_INTENT_MAP.social_media;
  // Productivity / No-code
  if (q.includes('productivity') || q.includes('notion') || q.includes('nocode') ||
      q.includes('automat') || q.includes('workflow') || q.includes('project'))
    return BUYER_INTENT_MAP.productivity;
  // Dev
  if (q.includes('code') || q.includes('develop') || q.includes('programming') ||
      q.includes('app') || q.includes('api') || q.includes('web'))
    return BUYER_INTENT_MAP.development;
  // SaaS B2B
  if (q.includes('saas') || q.includes('software') || q.includes('subscription') ||
      q.includes('platform') || q.includes('b2b'))
    return BUYER_INTENT_MAP.saas_b2b;
  return BUYER_INTENT_MAP.default;
}

/**
 * Expands a user query into effective Reddit search keyword phrases.
 * Focuses on phrases real BUYERS would write when describing their problem.
 */
export async function expandQuery(userInput, currentSubreddits = []) {
  try {
    const result = await callGeminiJSON(
      'You convert product descriptions into Reddit search keywords that match BUYER pain points. Think about what someone who NEEDS this product would type on Reddit. Output JSON only.',
      `Product/service: "${userInput}"

Generate 4-6 search keyword phrases that match what POTENTIAL BUYERS would write on Reddit.
Think: complaints, requests for recommendations, frustrations, "looking for X", "alternative to Y".

Example: "AI image generator"
Output: {"queries":["best AI image generator","how to generate AI art","midjourney alternative free","AI art tool recommendation","create images with AI"]}

Example: "project management tool"
Output: {"queries":["project management tool alternative","trello alternative","team task management","looking for project tracker","overwhelmed managing projects"]}

Return JSON: {"queries": ["phrase1", "phrase2", ...]}`
    );

    return {
      queries: Array.isArray(result.queries) ? result.queries.slice(0, 6) : [userInput],
      suggestedSubreddits: [],
    };
  } catch (error) {
    console.error('Query expansion failed:', error.message);
    const words = userInput.split(/\s+/).filter(w => w.length > 3);
    return {
      queries: words.length > 0 ? [userInput, ...words.slice(0, 2)] : [userInput],
      suggestedSubreddits: [],
    };
  }
}
