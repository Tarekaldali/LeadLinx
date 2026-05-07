/**
 * LeadLinx V2 AI Orchestrator
 * Featuring: Smart Rate Limit Handling & Auto-Retries
 * EXCLUSIVELY using OpenRouter for all operations.
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust JSON Extractor
 * @param {string} text - Raw AI response
 * @param {'array' | 'object'} expectedType - Desired return type
 */
function extractAndParseJSON(text, expectedType = 'array') {
  const defaultVal = expectedType === 'array' ? [] : { subreddits: [], search_queries: [] };
  
  try {
    if (!text) return defaultVal;

    // Remove markdown code blocks
    const cleanedText = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
    
    // Attempt direct parse first
    try {
      const direct = JSON.parse(cleanedText);
      if (expectedType === 'object' && Array.isArray(direct)) {
        // If AI returned an array of objects like [{"search_queries": [...], "subreddits": [...]}]
        // we flatten them into a single plan object.
        const merged = { subreddits: [], search_queries: [] };
        direct.forEach(item => {
          if (typeof item === 'string') merged.search_queries.push(item);
          else {
            if (Array.isArray(item.subreddits)) merged.subreddits.push(...item.subreddits);
            if (Array.isArray(item.search_queries)) merged.search_queries.push(...item.search_queries);
            if (item.search_query) merged.search_queries.push(item.search_query);
          }
        });
        return merged;
      }
      return direct;
    } catch (e) {
      // Fallback to substring extraction
      const startChar = expectedType === 'array' ? '[' : '{';
      const endChar = expectedType === 'array' ? ']' : '}';
      const startIndex = cleanedText.indexOf(startChar);
      const endIndex = cleanedText.lastIndexOf(endChar);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = cleanedText.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonStr);
      }
      throw e;
    }
  } catch (error) {
    console.error(`❌ JSON Parse Failed (${expectedType}). Raw snippet:`, text?.substring(0, 100));
    return defaultVal; 
  }
}

/**
 * NEW: Intent Gatekeeper
 * Classifies if the user wants to CHAT or perform a lead SEARCH.
 */
export async function classifyIntent(query) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat", // Use DeepSeek V3 for fast classification
        messages: [
          {
            role: "system",
            content: `You are the LeadLinx Intent Classifier. Determine if the user wants to perform a lead search or just talk.
            
            - SEARCH: User describes a product, a niche, or says "find leads for...".
            - CHAT: Greetings, general questions, or small talk.
            
            Return ONLY JSON: {"intent": "SEARCH" | "CHAT", "response_message": "A friendly reply if CHAT, otherwise empty string"}`
          },
          { role: "user", content: query }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return extractAndParseJSON(content, 'object');
  } catch (error) {
    console.error("⚠️ Intent Classification Error:", error);
    return { intent: "SEARCH", response_message: "" }; // Default to search to be safe
  }
}

/**
 * PHASE 1: Strategic Search Planning
 * Reverse-engineers product description into high-converting Boolean queries.
 */
export async function generateSearchPlan(query) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { 
            role: "system",
            content: `You are the "LeadLinx Search Architect," an elite growth hacker and social listening expert.
            Your sole purpose is to reverse-engineer a user's product/service into high-converting Reddit search queries.
            
            STRATEGIC PILLARS:
            1. COMPETITOR INTERCEPTION: Users complaining about a competitor (e.g., "competitor sucks", "alternative to").
            2. PAIN-POINT MINING: Users describing the exact problem (e.g., "tired of...", "why is [X] so expensive").
            3. SOLUTION SEEKING: Users explicitly asking for recommendations (e.g., "recommend", "looking for a tool").
            
            RULES:
            - Use Boolean logic (OR, AND, quotes " ").
            - Return ONLY JSON.
            - Exactly 3 advanced search_queries.
            - Max 5 high-intent subreddits.`
          },
          { role: "user", content: `Product/Leads Wanted: "${query}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const plan = extractAndParseJSON(content, 'object');
    
    return {
      subreddits: Array.isArray(plan?.subreddits) ? plan.subreddits : [],
      search_queries: Array.isArray(plan?.search_queries) ? plan.search_queries : [query],
      usage: data.usage
    };
  } catch (error) {
    console.error("⚠️ Search Plan Error:", error);
    return { subreddits: [], search_queries: [query] };
  }
}

/**
 * PHASE 2: Lead Scorer Orchestration
 */
export async function analyzeLeadsBatch(batch, userQuery) {
  try {
    // Primary: Gemini 2.0 Flash 001 via OpenRouter
    return await callOpenRouterAnalysis("google/gemini-2.0-flash-001", batch, userQuery);
  } catch (error) {
    console.warn(`⚠️ Primary Model Failed: ${error.message}. Trying Fallback...`);
    try {
      // Fallback: Mistral 7B Free via OpenRouter
      return await callOpenRouterAnalysis("mistralai/mistral-7b-instruct:free", batch, userQuery);
    } catch (fallbackError) {
      console.error("❌ All AI Providers Failed:", fallbackError.message);
      return { leads: [], usage: null }; 
    }
  }
}

/**
 * Helper: Call OpenRouter for Analysis
 */
async function callOpenRouterAnalysis(model, batch, userQuery, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: `You are the "LeadLinx Ruthless Scorer," a strict qualification engine.
              Analyze Reddit posts for "Buyer Intent" based on the user's goal: "${userQuery}".
              
              CONTEXT:
              The user's goal is to find high-intent prospects. If the goal is a service (e.g. "Find real estate agents"), then a HOT LEAD is someone EXPLICITLY looking for that service.
              
              SCORING MASTER FORMULA:
              - 1-6 (TRASH/AWARE): General chat, self-promotion, or no clear intent.
              - 7-8 (HOT LEAD): User has a pain point or is ACTIVELY seeking advice/alternatives related to the goal.
              - 9-10 (READY TO BUY): User is asking for direct recommendations, mentioning budget, or expressing extreme urgency.
              
              STRICT RULES:
              1. Filter out ANY post scoring below 7.
              2. If none found, return: {"leads": []}.
              3. reasoning: Max 10 words. Explain WHY they are a lead.
              4. suggestedReply: Max 20 words hook.
              
              Return ONLY JSON: {"leads": [{"postId": "...", "intentScore": number(7-10), "leadType": "Pain-Point"|"Competitor-Frustration"|"Solution-Seeking", "reasoning": "...", "suggestedReply": "..."}]}`
            },
            {
              role: "user",
              content: `Analyze these posts:\n${JSON.stringify(batch.map(p => ({ id: p.postId, title: p.title, text: p.text.substring(0, 600) })))}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 && attempt < retries) {
          await sleep(5000); continue;
        }
        throw new Error(data.error.message || "OpenRouter Failed");
      }

      const content = data.choices?.[0]?.message?.content;
      const parsed = extractAndParseJSON(content, 'object');
      
      return {
        leads: Array.isArray(parsed?.leads) ? parsed.leads : [],
        usage: data.usage,
        model: data.model || model
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(2000);
    }
  }
}