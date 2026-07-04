import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - fetch outreach history for the user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    const history = await db.collection('outreach_history')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get outreach history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// POST - save a generated message to history
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generatedText, platform, tone, leadId, leadName, leadTitle, context } = await request.json();

    if (!generatedText) {
      return NextResponse.json({ error: 'No text to save.' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    const doc = {
      userId,
      generatedText,
      platform,
      tone,
      context: context?.substring(0, 500), // truncate for storage
      leadId: leadId || null,
      leadName: leadName || 'Manual Context',
      leadTitle: leadTitle || null,
      createdAt: new Date(),
    };

    const result = await db.collection('outreach_history').insertOne(doc);

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Save outreach history error:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

// DELETE - delete a single history entry
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    await db.collection('outreach_history').deleteOne({
      _id: new ObjectId(id),
      userId, // ensure ownership
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete outreach history error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
