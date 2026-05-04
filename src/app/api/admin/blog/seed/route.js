import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

const seedPosts = [
  {
    slug: 'how-to-find-leads-on-reddit',
    title: 'How to Find Leads on Reddit in 2024',
    excerpt: 'A complete guide to finding high-intent buyers on Reddit using AI-powered monitoring and manual strategies.',
    content: `Reddit has over 57 million daily active users discussing every topic imaginable. For B2B companies, this represents an untapped goldmine of buying intent signals.

Unlike LinkedIn or Twitter, Reddit conversations are raw and authentic. When someone posts "Looking for a CRM that doesn't cost $500/seat," that's a real buying signal, not corporate marketing speak.

Step 1: Identify Your Target Subreddits

Start with subreddits where your ideal customers hang out. For SaaS products, consider:

• r/SaaS — SaaS founders and operators
• r/entrepreneur — Business builders
• r/smallbusiness — Small business owners
• r/marketing — Marketing professionals
• r/startups — Early-stage founders

Step 2: Monitor for Buying Keywords

Look for phrases that signal purchase intent:

• "Looking for a tool that..."
• "Any alternatives to..."
• "Budget of $X for..."
• "Recommendations for..."
• "Switching from [competitor]..."

Step 3: Use AI to Scale

Manually monitoring subreddits doesn't scale. Tools like LeadLinx use AI to scan thousands of posts per hour and score them by buying intent, so you only see the hottest leads.

AI-powered intent detection analyzes post language, context, and urgency to assign a score from 1-10. Only leads scoring 7+ are worth your time.

Step 4: Engage Authentically

Never spam. Always provide genuine value in your replies. Share insights, answer questions, and only mention your product when it's genuinely relevant.

The key is to be a helpful community member first, and a seller second.

Conclusion

Reddit lead generation works because it meets prospects where they're already asking for solutions. Start small, stay authentic, and let AI handle the scale.`,
    sections: [
      { heading: 'Why Reddit for Lead Generation?', content: 'Reddit has over 57 million daily active users discussing every topic imaginable. For B2B companies, this represents an untapped goldmine of buying intent signals.\n\nUnlike LinkedIn or Twitter, Reddit conversations are raw and authentic. When someone posts "Looking for a CRM that doesn\'t cost $500/seat," that\'s a real buying signal, not corporate marketing speak.' },
      { heading: 'Step 1: Identify Your Target Subreddits', content: 'Start with subreddits where your ideal customers hang out. For SaaS products, consider:\n\n• r/SaaS — SaaS founders and operators\n• r/entrepreneur — Business builders\n• r/smallbusiness — Small business owners\n• r/marketing — Marketing professionals\n• r/startups — Early-stage founders' },
      { heading: 'Step 2: Monitor for Buying Keywords', content: 'Look for phrases that signal purchase intent:\n\n• "Looking for a tool that..."\n• "Any alternatives to..."\n• "Budget of $X for..."\n• "Recommendations for..."\n• "Switching from [competitor]..."' },
      { heading: 'Step 3: Use AI to Scale', content: 'Manually monitoring subreddits doesn\'t scale. Tools like LeadLinx use AI to scan thousands of posts per hour and score them by buying intent, so you only see the hottest leads.\n\nAI-powered intent detection analyzes post language, context, and urgency to assign a score from 1-10. Only leads scoring 7+ are worth your time.' },
      { heading: 'Step 4: Engage Authentically', content: 'Never spam. Always provide genuine value in your replies. Share insights, answer questions, and only mention your product when it\'s genuinely relevant.\n\nThe key is to be a helpful community member first, and a seller second.' },
      { heading: 'Conclusion', content: 'Reddit lead generation works because it meets prospects where they\'re already asking for solutions. Start small, stay authentic, and let AI handle the scale.' },
    ],
    date: new Date('2024-12-15'),
    readTime: '8 min',
    category: 'Strategy',
    published: true,
  },
  {
    slug: 'best-reddit-lead-generation-tools',
    title: 'Best Reddit Lead Generation Tools Compared',
    excerpt: 'An honest comparison of Reddit monitoring and lead generation tools for B2B sales teams.',
    content: `The best Reddit lead generation tool should offer:

1. Real-time monitoring — Reddit moves fast
2. AI intent scoring — Not every mention is a lead
3. Reply assistance — Generate helpful, non-spammy responses
4. Keyword filtering — Remove noise with negative keywords

LeadLinx

AI-powered platform that scans Reddit in real-time and scores posts by buying intent. Includes auto-reply generation, saved leads management, and negative keyword filtering. Best for teams who want an all-in-one solution with AI-powered intent detection.

GummySearch

Popular Reddit audience research tool focused on discovery and monitoring. Great for understanding community pain points and finding content ideas. Best for market research use cases.

Syften

Keyword monitoring across Reddit and other platforms with email alerts. Simple and effective for basic monitoring. Best for teams who need multi-platform monitoring.

Conclusion

The best tool depends on your workflow. For AI-powered intent detection and reply generation, LeadLinx offers the most complete solution for converting Reddit conversations into sales pipeline.`,
    sections: [
      { heading: 'What to Look For', content: 'The best Reddit lead generation tool should offer:\n\n1. Real-time monitoring — Reddit moves fast\n2. AI intent scoring — Not every mention is a lead\n3. Reply assistance — Generate helpful, non-spammy responses\n4. Keyword filtering — Remove noise with negative keywords' },
      { heading: 'LeadLinx', content: 'AI-powered platform that scans Reddit in real-time and scores posts by buying intent. Includes auto-reply generation, saved leads management, and negative keyword filtering. Best for teams who want an all-in-one solution with AI-powered intent detection.' },
      { heading: 'GummySearch', content: 'Popular Reddit audience research tool focused on discovery and monitoring. Great for understanding community pain points and finding content ideas. Best for market research use cases.' },
      { heading: 'Syften', content: 'Keyword monitoring across Reddit and other platforms with email alerts. Simple and effective for basic monitoring. Best for teams who need multi-platform monitoring.' },
      { heading: 'Conclusion', content: 'The best tool depends on your workflow. For AI-powered intent detection and reply generation, LeadLinx offers the most complete solution for converting Reddit conversations into sales pipeline.' },
    ],
    date: new Date('2024-12-10'),
    readTime: '12 min',
    category: 'Tools',
    published: true,
  },
  {
    slug: 'find-customers-without-ads',
    title: 'How to Find Customers Without Ads',
    excerpt: 'Organic strategies for finding customers without spending on paid advertising.',
    content: `Paid ads are getting more expensive every year. CAC through paid channels has increased 60% in the last 3 years. Organic channels require more patience but deliver higher-quality leads at lower long-term cost.

1. Reddit Prospecting

Monitor subreddits where your customers discuss problems your product solves. Engage authentically and build relationships before pitching. Reddit users value genuine expertise over sales pitches.

2. Community Building

Create or participate in communities around your niche. Provide value consistently and become a trusted voice. This builds brand awareness and creates inbound demand.

3. Content Marketing

Write in-depth guides that answer the exact questions your prospects are asking on Reddit and Google. Target long-tail keywords with high buying intent.

4. SEO-Driven Landing Pages

Create pages targeting "alternative to [competitor]" and "[problem] solution" keywords. These capture prospects at the bottom of the funnel who are ready to buy.

5. Social Proof Loops

Ask happy customers to share their experience in relevant communities. Organic word-of-mouth is the most powerful lead gen channel and costs nothing.

Conclusion

Start with Reddit prospecting — it's the fastest path to finding people who are already looking for what you sell. Tools like LeadLinx can automate the monitoring so you only spend time on the highest-intent leads.`,
    sections: [
      { heading: 'Why Go Organic?', content: 'Paid ads are getting more expensive every year. CAC through paid channels has increased 60% in the last 3 years. Organic channels require more patience but deliver higher-quality leads at lower long-term cost.' },
      { heading: '1. Reddit Prospecting', content: 'Monitor subreddits where your customers discuss problems your product solves. Engage authentically and build relationships before pitching. Reddit users value genuine expertise over sales pitches.' },
      { heading: '2. Community Building', content: 'Create or participate in communities around your niche. Provide value consistently and become a trusted voice. This builds brand awareness and creates inbound demand.' },
      { heading: '3. Content Marketing', content: 'Write in-depth guides that answer the exact questions your prospects are asking on Reddit and Google. Target long-tail keywords with high buying intent.' },
      { heading: '4. SEO-Driven Landing Pages', content: 'Create pages targeting "alternative to [competitor]" and "[problem] solution" keywords. These capture prospects at the bottom of the funnel who are ready to buy.' },
      { heading: '5. Social Proof Loops', content: 'Ask happy customers to share their experience in relevant communities. Organic word-of-mouth is the most powerful lead gen channel and costs nothing.' },
      { heading: 'Conclusion', content: 'Start with Reddit prospecting — it\'s the fastest path to finding people who are already looking for what you sell. Tools like LeadLinx can automate the monitoring so you only spend time on the highest-intent leads.' },
    ],
    date: new Date('2024-12-05'),
    readTime: '10 min',
    category: 'Growth',
    published: true,
  },
];

export async function POST(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();

    let seeded = 0;
    let skipped = 0;

    for (const post of seedPosts) {
      const existing = await db.collection('blog').findOne({ slug: post.slug });
      if (existing) {
        skipped++;
        continue;
      }
      await db.collection('blog').insertOne({
        ...post,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      seeded++;
    }

    return NextResponse.json({
      message: `Seeded ${seeded} posts, skipped ${skipped} existing.`,
      seeded,
      skipped,
    });
  } catch (error) {
    console.error('Blog seed error:', error);
    return NextResponse.json({ error: 'Failed to seed blog posts' }, { status: 500 });
  }
}
