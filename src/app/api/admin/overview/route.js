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
    
    // Get total users
    const totalUsers = await db.collection('users').countDocuments();
    
    // Get active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await db.collection('users').countDocuments({
      lastActive: { $gte: sevenDaysAgo }
    });
    
    // Get total searches
    const totalSearches = await db.collection('searches').countDocuments();
    
    // Get total leads found
    const usersAggregation = await db.collection('users').aggregate([
      { $group: { _id: null, totalLeads: { $sum: "$leadsFound" } } }
    ]).toArray();
    const totalLeads = usersAggregation[0]?.totalLeads || 0;
    
    // Calculate MRR (simplified approximation based on plan types)
    const planCounts = await db.collection('users').aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]).toArray();
    
    const planPrices = {
      free: 0,
      starter: 3.99,
      premium: 7.99,
    };
    
    let mrr = 0;
    planCounts.forEach(plan => {
      const price = planPrices[plan._id] || 0;
      mrr += price * plan.count;
    });

    // Conversion rate (paid users / total users)
    const paidUsers = planCounts.filter(p => p._id !== 'free').reduce((acc, curr) => acc + curr.count, 0);
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalSearches,
      totalLeads,
      mrr,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      planDistribution: planCounts
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin overview' }, { status: 500 });
  }
}
