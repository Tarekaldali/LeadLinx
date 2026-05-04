import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();

    // High-demand keywords (from searches)
    const highDemandKeywords = await db.collection('searches').aggregate([
      { $unwind: "$keywords" },
      { $group: { _id: { $toLower: "$keywords" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // High-intent subreddits (from searches)
    const highIntentSubreddits = await db.collection('searches').aggregate([
      { $unwind: "$subreddits" },
      { $group: { _id: { $toLower: "$subreddits" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // SEO ideas based on top keywords
    const seoIdeas = highDemandKeywords.slice(0, 5).map(kw => 
      `How to Find ${kw._id.charAt(0).toUpperCase() + kw._id.slice(1)} Leads on Reddit`
    );

    return NextResponse.json({
      highDemandKeywords,
      highIntentSubreddits,
      seoIdeas: seoIdeas.length > 0 ? seoIdeas : undefined,
    });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
