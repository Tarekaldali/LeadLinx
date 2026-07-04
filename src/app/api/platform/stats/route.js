import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

/**
 * GET /api/platform/stats
 * Returns global platform-level aggregated stats.
 * If platform_stats collection is empty, seeds it from the real saved_leads count.
 */
export async function GET() {
  try {
    const db = await getDb();

    let statsDoc = await db.collection('platform_stats').findOne({ _id: 'global' });

    // Seed the counter from actual saved_leads if it has never been set
    if (!statsDoc || !statsDoc.totalLeadsExtracted) {
      const realCount = await db.collection('saved_leads').countDocuments();
      await db.collection('platform_stats').updateOne(
        { _id: 'global' },
        { $set: { totalLeadsExtracted: realCount } },
        { upsert: true }
      );
      return NextResponse.json({ totalLeads: realCount });
    }

    return NextResponse.json({ totalLeads: statsDoc.totalLeadsExtracted });
  } catch (error) {
    console.error('Platform stats error:', error);
    return NextResponse.json({ totalLeads: 0 }, { status: 500 });
  }
}
