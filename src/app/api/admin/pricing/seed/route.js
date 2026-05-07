import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    
    const plans = [
      {
        name: 'Free',
        price: '$0',
        period: '/month',
        description: 'Get started with AI-powered lead discovery.',
        features: [
          '400 Credits / month',
          'Basic AI Lead Scoring',
          'Reply Generation (5/day)',
          'CSV Export',
        ],
        cta: 'Get Started Free',
        ctaHref: '/signup',
        highlight: false,
        badge: null,
      },
      {
        name: 'Plus',
        price: '$3.99',
        period: '/month',
        description: 'Ideal for solo founders and small sales teams.',
        features: [
          '1000 Credits / month',
          'Advanced AI Lead Scoring',
          'Unlimited Reply Generation',
          'Priority Support',
          'Negative Keyword Filters',
        ],
        cta: 'Upgrade to Plus',
        ctaHref: '/checkout?plan=plus',
        highlight: false,
        badge: null,
      },
      {
        name: 'Pro',
        price: '$7.99',
        period: '/month',
        description: 'Perfect for scaling agencies and sales squads.',
        features: [
          '2000 Credits / month',
          'Advanced Intent Analysis',
          'Unlimited Reply Generation',
          'Priority Support (Slack)',
          'Email Alerts for Hot Leads',
          'Team Collaboration (3 seats)',
        ],
        cta: 'Upgrade to Pro',
        ctaHref: '/checkout?plan=pro',
        highlight: true,
        badge: 'MOST POPULAR',
      },
      {
        name: 'Enterprise',
        price: '$19.99',
        period: '/month',
        description: 'Perfect for large organizations and high-volume needs.',
        features: [
          '5000 Credits / month',
          'Advanced Intent Analysis',
          'Unlimited Reply Generation',
          'Priority Support (Slack)',
          'Email Alerts for Hot Leads',
          'Team Collaboration (10 seats)',
        ],
        cta: 'Upgrade to Enterprise',
        ctaHref: '/checkout?plan=enterprise',
        highlight: false,
        badge: 'SCALING',
      }
    ];

    // Clear existing plans and insert new ones
    await db.collection('plans').deleteMany({});
    await db.collection('plans').insertMany(plans);

    return NextResponse.json({ message: 'Pricing plans seeded successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
