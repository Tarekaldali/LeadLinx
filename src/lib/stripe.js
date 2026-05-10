/**
 * LeadLinx Stripe Configuration
 * Centralized Stripe instance and plan price mappings.
 */
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Map plan names to Stripe price IDs (create these in your Stripe Dashboard)
// For now, using dynamic pricing — prices created on-the-fly if not hardcoded
export const PLAN_PRICES = {
  starter: { amount: 2900, credits: 400, name: 'Starter' },
  plus: { amount: 7900, credits: 1000, name: 'Plus' },
  pro: { amount: 14900, credits: 2000, name: 'Pro' },
  enterprise: { amount: 29900, credits: 5000, name: 'Enterprise' },
};

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(db, userId, email, name) {
  const user = await db.collection('users').findOne(
    { _id: userId },
    { projection: { stripeCustomerId: 1 } }
  );

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId: userId.toString() },
  });

  // Save to DB
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: { stripeCustomerId: customer.id } }
  );

  return customer.id;
}
