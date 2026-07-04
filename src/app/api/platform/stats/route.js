import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

/**
 * GET /api/platform/stats
 * Returns global platform-level aggregated stats for landing page display.
 * Uses a dedicated `platform_stats` collection with a single "global" document
 * that is upserted whenever a lead is saved, keeping it fast without a full count query.
 */
export async function GET() {
  try {
    const db = await getDb();

    const statsDoc = await db.collection('platform_stats').findOne({ _id: 'global' });

    const totalLeads = statsDoc?.totalLeadsExtracted ?? 0;

    return NextResponse.json({ totalLeads });
  } catch (error) {
    console.error('Platform stats error:', error);
    return NextResponse.json({ totalLeads: 0 }, { status: 500 });
  }
}
