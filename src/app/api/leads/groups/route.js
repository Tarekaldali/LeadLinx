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

    // 3. Format into Groups with dynamic counts (Handling both String and ObjectId)
    const monitorGroups = await Promise.all(monitors.map(async m => {
      const dynamicCount = await db.collection('leads').countDocuments({ 
        monitorId: { $in: [m._id, m._id.toString()] },
        userId 
      });
      return {
        id: m._id.toString(),
        type: 'monitor',
        title: m.goal || 'Untitled Monitor',
        leadCount: dynamicCount || m.stats?.leadsFound || 0,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt || m.stats?.lastRun,
        status: m.status || 'active',
        sourceType: 'Surveillance'
      };
    }));

    const searchGroups = await Promise.all(searches.map(async s => {
      const dynamicCount = await db.collection('leads').countDocuments({ 
        searchId: { $in: [s._id, s._id.toString()] },
        userId 
      });
      return {
        id: s._id.toString(),
        type: 'search',
        title: s.query || 'Manual Search',
        leadCount: dynamicCount || s.leadCount || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt || s.createdAt,
        status: 'completed',
        sourceType: 'Manual Search'
      };
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

export async function DELETE(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'monitor' or 'search'

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const objectId = new ObjectId(id);

    if (type === 'monitor') {
      // 1. Delete Monitor
      await db.collection('monitors').deleteOne({ _id: objectId, userId });
      // 2. Delete associated leads
      await db.collection('leads').deleteMany({ monitorId: objectId, userId });
    } else {
      // 1. Delete Search Session
      await db.collection('searches').deleteOne({ _id: objectId, userId });
      // 2. Delete associated leads
      await db.collection('leads').deleteMany({ searchId: objectId, userId });
    }

    return NextResponse.json({ success: true, message: 'Group and associated leads deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
