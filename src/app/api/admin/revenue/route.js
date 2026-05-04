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

    // Plan distribution
    const planCounts = await db.collection('users').aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]).toArray();

    const planPrices = { starter: 49, growth: 149, enterprise: 499, free: 0 };

    let mrr = 0;
    planCounts.forEach(plan => {
      const price = planPrices[plan._id] || 0;
      mrr += price * plan.count;
    });

    // Total revenue (simplified: MRR * months active, approximation)
    const totalRevenue = mrr * 3; // Placeholder - multiply by estimated months

    // Paid users
    const paidUsers = planCounts
      .filter(p => p._id && p._id !== 'free' && p._id !== 'starter')
      .reduce((acc, curr) => acc + curr.count, 0);

    // Churn rate (placeholder calculation)
    const totalUsers = await db.collection('users').countDocuments();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactiveUsers = await db.collection('users').countDocuments({
      lastActive: { $lt: thirtyDaysAgo }
    });
    const churnRate = totalUsers > 0 ? ((inactiveUsers / totalUsers) * 100).toFixed(1) : 0;

    // Revenue trend (simulated from plan data)
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    const revenueTrend = months.map((month, i) => ({
      month,
      revenue: Math.round(mrr * (0.4 + (i * 0.12)))
    }));

    // Recent subscribers (paid users)
    const recentSubscribers = await db.collection('users')
      .find(
        { plan: { $in: ['starter', 'growth', 'enterprise'] } },
        { projection: { email: 1, plan: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const subscribersWithMRR = recentSubscribers.map(sub => ({
      ...sub,
      mrr: planPrices[sub.plan] || 0,
    }));

    return NextResponse.json({
      mrr,
      totalRevenue,
      paidUsers,
      churnRate: parseFloat(churnRate),
      planDistribution: planCounts,
      revenueTrend,
      recentSubscribers: subscribersWithMRR,
    });
  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}
