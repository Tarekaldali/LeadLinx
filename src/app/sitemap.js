import { getDb } from '@/lib/mongodb';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default async function sitemap() {
  const staticPages = [
    { url: `${BASE_URL}/`, lastModified: new Date('2026-07-19'), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date('2026-07-19'), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date('2026-07-19'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: new Date('2026-07-19'), changeFrequency: 'yearly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date('2026-07-19'), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date('2026-07-19'), changeFrequency: 'yearly', priority: 0.5 },
  ];

  // Dynamic blog pages from DB
  let blogPages = [];
  try {
    const db = await getDb();
    const posts = await db.collection('blog')
      .find({ published: true })
      .project({ slug: 1, updatedAt: 1, date: 1 })
      .toArray();

    blogPages = posts.map(post => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.date || new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Sitemap blog fetch error:', error);
    // Fallback to known slugs
    const fallbackSlugs = [
      'how-to-find-leads-on-reddit',
      'best-reddit-lead-generation-tools',
      'find-customers-without-ads',
    ];
    blogPages = fallbackSlugs.map(slug => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  }

  const programmaticKeywords = [
    'crm-alternatives',
    'aws-costs',
    'lead-generation',
    'project-management',
    'email-marketing',
    'analytics-tools',
  ];
  const programmaticPages = programmaticKeywords.map(keyword => ({
    url: `${BASE_URL}/find-leads/${keyword}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages, ...programmaticPages];
}
