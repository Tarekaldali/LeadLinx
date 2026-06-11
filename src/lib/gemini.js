const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

// ─── Pricing Logic (Mapped to Credits) ──────────────────────────────────────
const PROFIT_MARGIN = 3.5; 
export function calcCost(inputTokens, outputTokens, model = 'google/gemini-2.5-flash-lite') {
  // Use a generic pricing for simplified calculation
  const p = { input: 0.10, output: 0.40 };
  const inputCost  = (inputTokens  / 1_000_000) * p.input;
  const outputCost = (outputTokens / 1_000_000) * p.output;
  const rawCost    = inputCost + outputCost;
  const totalCost  = rawCost * PROFIT_MARGIN;
  const creditsToCharge = Math.max(1, Math.ceil(totalCost / 0.001));
  return { inputCost, outputCost, rawCost, totalCost, creditsToCharge, inputTokens, outputTokens };
}

/**
 * LeadLinx V2 AI Caller - EXCLUSIVELY OpenRouter
 */
export async function callGemini(messages, options = {}) {
  // Directly route to OpenRouter using the preferred model
  const model = options.model || DEFAULT_MODEL;
  return await callOpenRouter(messages, options, model);
}

export async function callOpenRouter(messages, options, modelName) {
  const orMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : msg.role,
    content: msg.content
  }));

  const requestBody = {
    model: modelName,
    messages: orMessages,
    temperature: options.temperature ?? 0.3,
  };
  
  if (options.responseFormat === 'json') {
    requestBody.response_format = { type: 'json_object' };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://leadlinx.ai',
          'X-Title': 'LeadLinx'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(err)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      return { text, inputTokens, outputTokens, model: 'openrouter' };
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// Rough token estimator
function estimateTokens(messages) {
  const total = messages.map(m => (m.content || '')).join(' ');
  return Math.ceil(total.length / 4);
}

// Compatibility functions
export async function filterLeadsByIntent(posts, userQuery = '', userContext = {}) {
  // This logic is mostly moved to backgroundWorker and aiOrchestrator, 
  // but we keep it here for any legacy calls.
  return { leads: [], costInfo: calcCost(0, 0), insights: null };
}

export async function generateReply(postTitle, postText, productContext = '') {
  const messages = [
    { role: 'system', content: 'You write authentic Reddit comments. Output valid JSON only: {"helpful":"...", "authority":"...", "conversion":"..."}' },
    { role: 'user', content: `Post: ${postTitle}\n\nContext: ${productContext}` }
  ];
  const res = await callOpenRouter(messages, { temperature: 0.7, responseFormat: 'json' }, DEFAULT_MODEL);
  try {
    return JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch {
    return { helpful: res.text, authority: res.text, conversion: res.text };
  }
}
