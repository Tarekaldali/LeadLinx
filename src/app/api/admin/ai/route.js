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

    // Total AI requests
    const totalRequests = await db.collection('ai_usage').countDocuments();

    // Filter vs reply breakdown
    const filterRequests = await db.collection('ai_usage').countDocuments({ type: 'lead_filter' });
    const replyRequests = await db.collection('ai_usage').countDocuments({ type: 'reply_generation' });

    // Estimated total cost
    const costAgg = await db.collection('ai_usage').aggregate([
      { $group: { _id: null, totalCost: { $sum: "$estimatedCost" } } }
    ]).toArray();
    const estimatedCost = costAgg[0]?.totalCost || 0;

    // Daily usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsage = await db.collection('ai_usage').aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%m/%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ]).toArray();

    // Top AI users
    const topUsers = await db.collection('ai_usage').aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
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
          count: 1
        }
      }
    ]).toArray();

    return NextResponse.json({
      totalRequests,
      filterRequests,
      replyRequests,
      estimatedCost,
      dailyUsage,
      topUsers: topUsers.map(u => ({ email: u.email || 'Unknown', count: u.count })),
    });
  } catch (error) {
    console.error('AI monitor error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI data' }, { status: 500 });
  }
}
