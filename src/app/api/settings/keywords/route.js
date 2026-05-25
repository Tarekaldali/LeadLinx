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
    const user = await db.collection('users').findOne(
      { email: authResult.user.email },
      { projection: { negativeKeywords: 1, emailAlerts: 1 } }
    );

    return NextResponse.json({ 
      negativeKeywords: user?.negativeKeywords || [],
      emailAlerts: user?.emailAlerts ?? true
    });
  } catch (error) {
    console.error('Get keywords error:', error);
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { negativeKeywords, emailAlerts } = await request.json();
    const db = await getDb();

    await db.collection('users').updateOne(
      { email: authResult.user.email },
      { $set: { 
          negativeKeywords: negativeKeywords || [],
          emailAlerts: emailAlerts ?? true 
        } 
      }
    );

    return NextResponse.json({ message: 'Keywords updated successfully' });
  } catch (error) {
    console.error('Update keywords error:', error);
    return NextResponse.json({ error: 'Failed to update keywords' }, { status: 500 });
  }
}
