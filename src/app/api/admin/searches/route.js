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
    
    // Get recent searches
    const recentSearches = await db.collection('searches')
      .find()
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
      
    // Aggregate top keywords
    const topKeywords = await db.collection('searches').aggregate([
      { $unwind: "$keywords" },
      { $group: { _id: { $toLower: "$keywords" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();
    
    // Aggregate top subreddits
    const topSubreddits = await db.collection('searches').aggregate([
      { $unwind: "$subreddits" },
      { $group: { _id: { $toLower: "$subreddits" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    return NextResponse.json({
      recentSearches,
      topKeywords,
      topSubreddits
    });
  } catch (error) {
    console.error('Admin searches error:', error);
    return NextResponse.json({ error: 'Failed to fetch search analytics' }, { status: 500 });
  }
}
