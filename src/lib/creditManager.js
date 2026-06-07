/**
 * LeadLinx Dynamic Credit Management
 * Calculates fair credit deduction based on actual AI token usage.
 */

const PLAN_RATES = {
  free: 0, // Credits are "free" but limited
  plus: 3.99 / 1000,       // 0.00399 $/credit
  pro: 7.99 / 2000,        // 0.003995 $/credit
  enterprise: 19.99 / 5000 // 0.003998 $/credit
};

const MODEL_PRICES = {
  // Prices per 1M tokens (OpenRouter: google/gemini-2.0-flash-001)
  'google/gemini-2.0-flash-001': {
    input: 0.10,
    output: 0.40
  },
  // Low-cost alternative (Mistral 7B via OpenRouter free tier)
  'mistralai/mistral-7b-instruct:free': {
    input: 0.02,
    output: 0.05
  },
  // Default fallback pricing
  'default': {
    input: 0.50,
    output: 1.50
  }
};

/**
 * Calculates the credits to deduct based on token usage.
 * Formula: ((prompt_tokens * input_price) + (completion_tokens * output_price)) * 10 (margin) / plan_rate
 * 
 * @param {string} model - The AI model used
 * @param {object} usage - { prompt_tokens, completion_tokens }
 * @param {string} plan - User's subscription plan (free, plus, pro, enterprise)
 */
export function calculateCreditsToDeduct(model, usage, plan = 'free') {
  if (!usage) return 1; // Fallback to 1 credit if no usage data

  const pricing = MODEL_PRICES[model] || MODEL_PRICES.default;
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;

  // Calculate raw cost in USD (price is per 1M tokens)
  const rawCost = (promptTokens * (pricing.input / 1000000)) + 
                  (completionTokens * (pricing.output / 1000000));

  // Add 10x margin as requested
  const priceToUser = rawCost * 10;

  // For free users, we still want to deduct credits based on a nominal value
  // We'll use the 'plus' rate as the baseline for 'free' credits value
  const creditValue = PLAN_RATES[plan] || PLAN_RATES.plus;

  // Calculate credits
  // If priceToUser is 0 (e.g. extremely small query), minimum 1 credit
  let credits = Math.ceil(priceToUser / creditValue);
  
  // Enforce a minimum of 1 credit. Remove maximum cap to ensure fair billing for high-volume results.
  return Math.max(1, credits);
}

export const PRO_RATE = 0.003995;
export const SURVEILLANCE_PROFIT_MARGIN = 10; // 10x margin for business viability

/**
 * Calculates credits for background surveillance monitors.
 * Uses a dedicated formula to handle long-running background tasks.
 * Formula: ((raw_usd_cost / pro_rate) * margin)
 */
export function calculateMonitorCredits(model, usage) {
  if (!usage) return 2; // Baseline for background overhead

  const pricing = MODEL_PRICES[model] || MODEL_PRICES.default;
  const rawCost = (usage.prompt_tokens * (pricing.input / 1000000)) + 
                  (usage.completion_tokens * (pricing.output / 1000000));

  // Step 1: Convert USD to Credits using the Pro Plan Rate ($0.003995/credit)
  const baseCredits = rawCost / PRO_RATE;
  
  // Step 3: Apply the 10x Profit Margin for consistency
  const finalCredits = Math.ceil(baseCredits * SURVEILLANCE_PROFIT_MARGIN);

  // Minimum 1 credit per scan to cover infrastructure and API overhead
  return Math.max(1, finalCredits);
}

/**
 * Helper to get the raw USD cost for admin tracking
 */
export function getRawCost(model, usage) {
  if (!usage) return 0;
  const pricing = MODEL_PRICES[model] || MODEL_PRICES.default;
  return (usage.prompt_tokens * (pricing.input / 1000000)) + 
         (usage.completion_tokens * (pricing.output / 1000000));
}
