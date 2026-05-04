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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const errors = await db.collection('logs')
      .find({ type: { $in: ['error', 'reddit_failure', 'rate_limit'] } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const serialized = errors.map(e => ({
      ...e,
      _id: e._id.toString(),
    }));

    return NextResponse.json({ errors: serialized });
  } catch (error) {
    console.error('Admin errors fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 });
  }
}
