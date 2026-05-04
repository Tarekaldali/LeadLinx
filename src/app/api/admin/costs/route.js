import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  // Admin only
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const user = await db.collection('users').findOne({ _id: new ObjectId(authResult.user.userId) }, { projection: { role: 1 } });
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    // Aggregate cost data per search
    const searches = await db.collection('ai_usage').aggregate([
      { $match: { timestamp: { $gte: since }, type: 'lead_search' } },
      {
        $group: {
          _id: '$chatId',
          userId:         { $first: '$userId' },
          searches:       { $sum: 1 },
          totalRawCost:   { $sum: '$rawCostUsd' },
          totalCost:      { $sum: '$totalCostUsd' },
          totalProfit:    { $sum: '$profitUsd' },
          creditsCharged: { $sum: '$creditsCharged' },
          totalLeads:     { $sum: '$leadsReturned' },
          postsAnalyzed:  { $sum: '$postsAnalyzed' },
          lastSearch:     { $max: '$timestamp' },
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: 100 },
    ]).toArray();

    // Overall totals
    const totals = await db.collection('ai_usage').aggregate([
      { $match: { timestamp: { $gte: since }, type: 'lead_search' } },
      {
        $group: {
          _id: null,
          totalSearches:    { $sum: 1 },
          totalRawCostUsd:  { $sum: '$rawCostUsd' },
          totalRevenueUsd:  { $sum: '$totalCostUsd' },
          totalProfitUsd:   { $sum: '$profitUsd' },
          totalLeads:       { $sum: '$leadsReturned' },
          avgCostPerSearch: { $avg: '$rawCostUsd' },
          totalCredits:     { $sum: '$creditsCharged' },
        }
      }
    ]).toArray();

    // Per-user summary
    const perUser = await db.collection('ai_usage').aggregate([
      { $match: { timestamp: { $gte: since }, type: 'lead_search' } },
      {
        $group: {
          _id: '$userId',
          searches:     { $sum: 1 },
          rawCost:      { $sum: '$rawCostUsd' },
          revenue:      { $sum: '$totalCostUsd' },
          profit:       { $sum: '$profitUsd' },
          leads:        { $sum: '$leadsReturned' },
          credits:      { $sum: '$creditsCharged' },
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]).toArray();

    // Lookup user emails
    const userIds = perUser.map(u => u._id).filter(Boolean);
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } }, { projection: { email: 1, name: 1, plan: 1 } })
      .toArray();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    return NextResponse.json({
      totals: totals[0] || {},
      searches: searches.map(s => ({
        ...s,
        _id: s._id?.toString() || 'no-chat',
        userId: s.userId?.toString(),
      })),
      perUser: perUser.map(u => ({
        ...u,
        _id: u._id?.toString(),
        user: userMap[u._id?.toString()] || null,
      })),
    });
  } catch (error) {
    console.error('Chat costs error:', error);
    return NextResponse.json({ error: 'Failed to load cost data' }, { status: 500 });
  }
}
