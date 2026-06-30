/**
 * LeadLinx Tap Payments Configuration
 */

// Map plan names to Tap amounts
export const PLAN_PRICES = {
  plus: { amount: 3.99, credits: 1000, name: 'Plus' },
  pro: { amount: 7.99, credits: 2000, name: 'Pro' },
  enterprise: { amount: 19.99, credits: 5000, name: 'Enterprise' },
};

export async function createTapCharge(payload) {
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`
    },
    body: JSON.stringify(payload)
  };

  const response = await fetch('https://api.tap.company/v2/charges/', options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('Tap Payments Charge Error:', errorData);
    throw new Error(`Tap Payments API Error: ${response.status}`);
  }

  return response.json();
}
