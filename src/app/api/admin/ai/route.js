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

    // Total AI requests (all types)
    const totalRequests = await db.collection('ai_usage').countDocuments();

    // Breakdown by type
    const filterRequests = await db.collection('ai_usage').countDocuments({ type: 'lead_filter' });
    const replyRequests = await db.collection('ai_usage').countDocuments({ type: 'reply_generation' });
    const searchRequests = await db.collection('ai_usage').countDocuments({ type: 'lead_search' });
    const chatRequests = await db.collection('ai_usage').countDocuments({ type: 'chat' });

    // Real cost aggregation from actual rawCostUsd field
    const costAgg = await db.collection('ai_usage').aggregate([
      { 
        $group: { 
          _id: null, 
          totalRawCost: { $sum: '$rawCostUsd' },
          totalRevenue: { $sum: '$totalCostUsd' },
          totalProfit: { $sum: '$profitUsd' },
          totalInputTokens: { $sum: '$totalUsage.prompt_tokens' },
          totalOutputTokens: { $sum: '$totalUsage.completion_tokens' },
          totalCreditsCharged: { $sum: '$creditsCharged' },
          totalLeadsReturned: { $sum: '$leadsReturned' },
        } 
      }
    ]).toArray();

    const costSummary = costAgg[0] || {};
    const estimatedCost = costSummary.totalRawCost || 0;

    // Daily usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsage = await db.collection('ai_usage').aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%m/%d', date: '$timestamp' } },
          count: { $sum: 1 },
          cost: { $sum: '$rawCostUsd' },
          tokens: { $sum: { $add: ['$totalUsage.prompt_tokens', '$totalUsage.completion_tokens'] } },
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, cost: 1, tokens: 1, _id: 0 } }
    ]).toArray();

    // Top AI users by requests
    const topUsers = await db.collection('ai_usage').aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 }, totalCost: { $sum: '$rawCostUsd' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          email: { $arrayElemAt: ['$user.email', 0] },
          name: { $arrayElemAt: ['$user.name', 0] },
          count: 1,
          totalCost: 1,
        }
      }
    ]).toArray();

    // Cost breakdown by type
    const costBreakdown = await db.collection('ai_usage').aggregate([
      {
        $group: {
          _id: '$type',
          requests: { $sum: 1 },
          rawCost: { $sum: '$rawCostUsd' },
          revenue: { $sum: '$totalCostUsd' },
          profit: { $sum: '$profitUsd' },
          tokens: { $sum: { $add: ['$totalUsage.prompt_tokens', '$totalUsage.completion_tokens'] } },
        }
      },
      { $sort: { requests: -1 } }
    ]).toArray();

    return NextResponse.json({
      totalRequests,
      filterRequests,
      replyRequests,
      searchRequests,
      chatRequests,
      estimatedCost,
      totalRevenue: costSummary.totalRevenue || 0,
      totalProfit: costSummary.totalProfit || 0,
      totalInputTokens: costSummary.totalInputTokens || 0,
      totalOutputTokens: costSummary.totalOutputTokens || 0,
      totalCreditsCharged: costSummary.totalCreditsCharged || 0,
      totalLeadsReturned: costSummary.totalLeadsReturned || 0,
      dailyUsage,
      costBreakdown,
      topUsers: topUsers.map(u => ({ email: u.email || 'Unknown', name: u.name || '', count: u.count, totalCost: u.totalCost || 0 })),
    });
  } catch (error) {
    console.error('AI monitor error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI data' }, { status: 500 });
  }
}
