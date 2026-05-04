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

    // Get alerts collection stats
    const totalAlerts = await db.collection('alerts').countDocuments();
    const delivered = await db.collection('alerts').countDocuments({ status: 'delivered' });
    const failed = await db.collection('alerts').countDocuments({ status: 'failed' });
    const deliveryRate = totalAlerts > 0 ? ((delivered / totalAlerts) * 100).toFixed(1) : 100;

    // Recent alerts
    const recentAlerts = await db.collection('alerts')
      .find()
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    // Enrich with user emails
    const enrichedAlerts = await Promise.all(
      recentAlerts.map(async (alert) => {
        if (alert.userId) {
          try {
            const { ObjectId } = await import('mongodb');
            const user = await db.collection('users').findOne(
              { _id: new ObjectId(alert.userId) },
              { projection: { email: 1 } }
            );
            return { ...alert, userEmail: user?.email || 'Unknown' };
          } catch {
            return { ...alert, userEmail: 'Unknown' };
          }
        }
        return { ...alert, userEmail: 'System' };
      })
    );

    return NextResponse.json({
      totalAlerts,
      delivered,
      failed,
      deliveryRate: parseFloat(deliveryRate),
      recentAlerts: enrichedAlerts,
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert data' }, { status: 500 });
  }
}
