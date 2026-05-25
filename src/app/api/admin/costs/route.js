import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  // Admin only
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const user = await db.collection('users').findOne({ _id: new ObjectId(authResult.user.id) }, { projection: { role: 1 } });
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '30';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'totalCost';
    const sortDir = parseInt(searchParams.get('sortDir') || '-1');

    const typeParam = searchParams.get('type') || 'all';

    const matchQuery = {};
    if (typeParam !== 'all') {
      matchQuery.type = typeParam;
    } else {
      matchQuery.type = { $in: ['lead_search', 'chat', 'reply_generation', 'lead_filter'] };
    }

    if (days !== '9999' && days !== 'all') {
      const since = new Date(Date.now() - parseInt(days) * 24 * 3600 * 1000);
      matchQuery.timestamp = { $gte: since };
    }

    // Optional text search filter across userId or chatId
    let searchFilter = {};
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      searchFilter = {
        $or: [
          { _id: searchRegex },
          { userEmail: searchRegex },
          { userIdStr: searchRegex }
        ]
      };
    }

    // Aggregate cost data per search (chatId)
    let searchesPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$chatId',
          userId: { $first: '$userId' },
          searches: { $sum: 1 },
          totalRawCost: { $sum: '$rawCostUsd' },
          totalCost: { $sum: '$totalCostUsd' },
          totalProfit: { $sum: '$profitUsd' },
          creditsCharged: { $sum: '$creditsCharged' },
          totalLeads: { $sum: '$leadsReturned' },
          postsAnalyzed: { $sum: '$postsAnalyzed' },
          promptTokens: { $sum: '$totalUsage.prompt_tokens' },
          completionTokens: { $sum: '$totalUsage.completion_tokens' },
          lastSearch: { $max: '$timestamp' },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $addFields: {
          userEmail: { $arrayElemAt: ['$userDetails.email', 0] },
          userIdStr: { $toString: '$userId' }
        }
      },
      { $match: searchFilter ? searchFilter : {} },
      { $sort: { [sortField]: sortDir } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { userDetails: 0 } }
    ];

    const searches = await db.collection('ai_usage').aggregate(searchesPipeline).toArray();

    // Get total count for pagination
    const countPipeline = [
      { $match: matchQuery },
      { $group: { _id: '$chatId', userId: { $first: '$userId' } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $addFields: {
          userEmail: { $arrayElemAt: ['$userDetails.email', 0] },
          userIdStr: { $toString: '$userId' }
        }
      },
      { $match: searchFilter ? searchFilter : {} },
      { $count: 'total' }
    ];
    const totalCountRes = await db.collection('ai_usage').aggregate(countPipeline).toArray();
    const totalSearchesCount = totalCountRes[0]?.total || 0;

    // Overall totals
    const totals = await db.collection('ai_usage').aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          totalRawCostUsd: { $sum: '$rawCostUsd' },
          totalRevenueUsd: { $sum: '$totalCostUsd' },
          totalProfitUsd: { $sum: '$profitUsd' },
          totalLeads: { $sum: '$leadsReturned' },
          avgCostPerSearch: { $avg: '$rawCostUsd' },
          totalCredits: { $sum: '$creditsCharged' },
        }
      }
    ]).toArray();

    // Per-user summary
    const perUser = await db.collection('ai_usage').aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$userId',
          searches: { $sum: 1 },
          rawCost: { $sum: '$rawCostUsd' },
          revenue: { $sum: '$totalCostUsd' },
          profit: { $sum: '$profitUsd' },
          leads: { $sum: '$leadsReturned' },
          credits: { $sum: '$creditsCharged' },
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
      totalSearchesCount,
      totalPages: Math.ceil(totalSearchesCount / limit),
      currentPage: page,
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
