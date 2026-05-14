import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// PATCH /api/monitors/[id] — Update monitor status (Stop/Resume)
export async function PATCH(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { id } = await params;
    const { status } = await request.json();
    
    if (!['active', 'paused'].includes(status)) {
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
          updatedAt: new Date() 
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
export async function DELETE(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { id } = await params;
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const monitorId = new ObjectId(id);

    const result = await db.collection('monitors').deleteOne({ _id: monitorId, userId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete monitor error:', error);
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }
}
