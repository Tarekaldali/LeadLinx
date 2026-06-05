const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-3.5-flash';

async function callGeminiJSON(systemPrompt, userPrompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://leadlinx.ai',
        'X-Title': 'LeadLinx'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error('OpenRouter call failed in queryEngine:', error.message);
    throw error;
  }
}

const BUYER_INTENT_MAP = {
  // courses: ['courses', 'buy', 'learning', 'education', 'academic', 'school', 'college'],
  // fastfood: ['fastfood', 'burger', 'buy', 'restaurant', 'food', 'delicacy', 'fast food'],
  ai_image: ['StableDiffusion', 'midjourney', 'aiArt', 'generativeAI', 'AIDiscussion', 'comfyui', 'artificial'],
  ai_writing: ['ChatGPT', 'artificial', 'AIAssistants', 'copywriting', 'marketing', 'Blogging', 'content_marketing'],
  ai_tools: ['ChatGPT', 'artificial', 'singularity', 'MachineLearning', 'AIDiscussion', 'productivity', 'SaaS', 'startups'],
  saas_b2b: ['sales', 'SaaS', 'smallbusiness', 'entrepreneur', 'startups', 'Indiehackers'],
  ecommerce: ['ecommerce', 'shopify', 'dropshipping', 'Entrepreneur', 'smallbusiness', 'AmazonFBA'],
  crm_sales: ['sales', 'salestechniques', 'sales_advice', 'smallbusiness', 'entrepreneur', 'SaaS', 'CRM'],
  marketing: ['marketing', 'digital_marketing', 'socialmedia', 'SEO', 'PPC', 'content_marketing'],
  design: ['graphic_design', 'web_design', 'UI_Design', 'UXDesign', 'logodesign', 'freelance', 'design'],
  video_editing: ['editors', 'VideoEditing', 'premiere', 'AfterEffects', 'filmmakers', 'NewTubers'],
  social_media: ['socialmedia', 'Instagram', 'TikTokTips', 'NewTubers', 'youtube', 'marketing'],
  productivity: ['productivity', 'nocode', 'Notion', 'projectmanagement', 'remotework', 'entrepreneur'],
  development: ['webdev', 'programming', 'learnprogramming', 'SideProject', 'startups', 'node', 'reactjs'],
  default: ['SaaS', 'entrepreneur', 'smallbusiness', 'startups', 'Entrepreneur', 'microsaas'],
};

export async function selectSubreddits(userQuery) {
  try {
    const result = await callGeminiJSON(
      `You are a Reddit growth expert. Find 5-7 subreddits where POTENTIAL CUSTOMERS of the given product hang out. Focus on buyer communities, not topic communities.`,
      `Product: "${userQuery}"\nReturn JSON: {"subreddits": ["name1", "name2", ...], "buyer_profile": "..."}`
    );
    const subs = Array.isArray(result?.subreddits) ? result.subreddits : [];
    return subs.filter(s => typeof s === 'string').slice(0, 8);
  } catch (error) {
    return getFallbackSubreddits(userQuery);
  }
}

function getFallbackSubreddits(query) {
  const q = query.toLowerCase();
  if (q.includes('image')) return BUYER_INTENT_MAP.ai_image;
  if (q.includes('write')) return BUYER_INTENT_MAP.ai_writing;
  if (q.includes('marketing')) return BUYER_INTENT_MAP.marketing;
  if (q.includes('sales')) return BUYER_INTENT_MAP.crm_sales;
  return BUYER_INTENT_MAP.default;
}

export async function expandQuery(userInput) {
  try {
    const result = await callGeminiJSON(
      'Convert product descriptions into Reddit search keywords that match BUYER pain points. Output JSON only.',
      `Product: "${userInput}"\nReturn JSON: {"queries": ["phrase1", "phrase2", ...]}`
    );
    return {
      queries: Array.isArray(result.queries) ? result.queries.slice(0, 6) : [userInput],
      suggestedSubreddits: [],
    };
  } catch (error) {
    return { queries: [userInput], suggestedSubreddits: [] };
  }
}
