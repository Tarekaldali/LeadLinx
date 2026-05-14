import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET /api/monitors — List user's surveillance monitors
export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const monitors = await db.collection('monitors')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ monitors });
  } catch (error) {
    console.error('List monitors error:', error);
    return NextResponse.json({ error: 'Failed to load monitors' }, { status: 500 });
  }
}

// POST /api/monitors — Create a new surveillance monitor
export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { goal, frequency = 60, emailAlert = { enabled: false, threshold: 10 } } = await request.json();
    if (!goal) return NextResponse.json({ error: 'Goal is required' }, { status: 400 });

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const monitor = {
      userId,
      goal,
      status: 'active',
      frequency, // minutes
      emailAlert, // { enabled: boolean, threshold: number }
      strategy: {
        subreddits: [], 
        keywords: [],
        intensity: 5
      },
      stats: {
        leadsFound: 0,
        totalCreditsSpent: 0,
        lastRun: null
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('monitors').insertOne(monitor);
    
    return NextResponse.json({ 
      monitorId: result.insertedId.toString(), 
      monitor: { ...monitor, _id: result.insertedId } 
    }, { status: 201 });
  } catch (error) {
    console.error('Create monitor error:', error);
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 });
  }
}
