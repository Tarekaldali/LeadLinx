import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// PATCH /api/monitors/[id] — Update monitor status (Stop/Resume/Finish)
export async function PATCH(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { id } = await params;
    const { status } = await request.json();
    
    if (!['active', 'paused', 'finished'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const monitorId = new ObjectId(id);

    const result = await db.collection('monitors').updateOne(
      { _id: monitorId, userId },
      { 
        $set: { 
          status, 
          updatedAt: new Date(),
          ...(status === 'finished' ? { finishedAt: new Date() } : {}),
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Update monitor error:', error);
    return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 });
  }
}

// DELETE /api/monitors/[id] — Remove a monitor
// Query param: ?destroyLeads=true — also deletes all leads from this monitor
export async function DELETE(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const destroyLeads = searchParams.get('destroyLeads') === 'true';

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const monitorId = new ObjectId(id);

    // Verify ownership first
    const monitor = await db.collection('monitors').findOne({ _id: monitorId, userId });
    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // Delete the monitor
    await db.collection('monitors').deleteOne({ _id: monitorId, userId });

    // Optionally purge all leads from this monitor session
    if (destroyLeads) {
      const deleteResult = await db.collection('leads').deleteMany({ 
        monitorId: monitorId,
        userId: userId.toString() 
      });
      // Also try with ObjectId userId just in case
      await db.collection('leads').deleteMany({ 
        monitorId: monitorId,
        userId: userId
      });
      console.log(`🗑️ [Destroy] Purged leads for monitor ${id}`);
    }

    return NextResponse.json({ success: true, leadsDestroyed: destroyLeads });
  } catch (error) {
    console.error('Delete monitor error:', error);
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }
}
