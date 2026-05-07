/**
 * LeadLinx V2 Pricing & Limits Configuration
 * Maps user subscription tiers to lead extraction limits.
 */

export const PRICING_CONFIG = {
  free: {
    maxLeads: 10,
    maxPostsAnalyzed: 500,
    maxCredits: 400,
    tierName: 'Free'
  },
  plus: {
    maxLeads: 10,
    maxPostsAnalyzed: 1000,
    maxCredits: 1000,
    tierName: 'Plus'
  },
  pro: {
    maxLeads: 20,
    maxPostsAnalyzed: 2000,
    maxCredits: 2000,
    tierName: 'Pro'
  },
  enterprise: {
    maxLeads: 30,
    maxPostsAnalyzed: 3000,
    maxCredits: 5000,
    tierName: 'Enterprise'
  }
};

/**
 * Helper to get user limit based on plan
 * @param {string} plan 
 * @returns {object} config
 */
export const getTierConfig = (plan) => {
  const normalizedPlan = (plan || 'free').toLowerCase();
  return PRICING_CONFIG[normalizedPlan] || PRICING_CONFIG.free;
};
