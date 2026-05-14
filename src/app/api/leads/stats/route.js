import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    
    const [generatedCount, savedCount, todayCount] = await Promise.all([
      db.collection('leads').countDocuments({ userId }),
      db.collection('saved_leads').countDocuments({ userId }),
      db.collection('leads').countDocuments({ 
        userId, 
        createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } 
      })
    ]);

    // Calculate average score for generated leads
    const avgScoreResult = await db.collection('leads').aggregate([
      { $match: { userId } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]).toArray();

    const avgScore = (avgScoreResult.length > 0 && !isNaN(avgScoreResult[0].avgScore) && avgScoreResult[0].avgScore !== null) 
      ? Math.round(avgScoreResult[0].avgScore) 
      : 0;

    return NextResponse.json({
      generatedCount,
      savedCount,
      todayCount,
      avgScore,
      conversionRate: generatedCount > 0 ? parseFloat(((savedCount / generatedCount) * 100).toFixed(1)) : 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
