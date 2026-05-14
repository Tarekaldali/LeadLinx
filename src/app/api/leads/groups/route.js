import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // 1. Fetch Monitors
    const monitors = await db.collection('monitors')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Fetch Manual Searches (Sessions)
    // We'll use the 'searches' collection which logs each search event
    const searches = await db.collection('searches')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // 3. Format into Groups
    const monitorGroups = monitors.map(m => ({
      id: m._id.toString(),
      type: 'monitor',
      title: m.goal || 'Untitled Monitor',
      leadCount: m.stats?.leadsFound || 0,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt || m.stats?.lastRun,
      status: m.status || 'active',
      sourceType: 'Surveillance'
    }));

    const searchGroups = searches.map(s => ({
      id: s._id.toString(),
      type: 'search',
      title: s.query || 'Manual Search',
      leadCount: s.leadCount || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt || s.createdAt,
      status: 'completed',
      sourceType: 'Manual Search'
    }));

    // Combine and sort by latest activity
    const groups = [...monitorGroups, ...searchGroups].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA;
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Fetch lead groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead groups' }, { status: 500 });
  }
}
