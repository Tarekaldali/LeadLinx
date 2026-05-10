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
    const saved = await db.collection('saved_leads')
      .find({ userId })
      .sort({ savedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ leads: saved });
  } catch (error) {
    console.error('Get saved leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch saved leads' }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const lead = await request.json();
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // Check if already saved
    const existing = await db.collection('saved_leads').findOne({
      userId,
      postId: lead.id,
    });

    if (existing) {
      return NextResponse.json({ message: 'Lead already saved' }, { status: 200 });
    }

    await db.collection('saved_leads').insertOne({
      userId,
      postId: lead.id,
      title: lead.title,
      text: lead.text || lead.body,
      body: lead.body,
      link: lead.link,
      author: lead.author,
      company: lead.company,
      subreddit: lead.subreddit,
      intentScore: lead.intentScore || lead.score,
      intentReason: lead.intentReason,
      leadType: lead.leadType,
      emails: lead.emails || [],
      phones: lead.phones || [],
      socials: lead.socials || [],
      suggestedReply: lead.suggestedReply,
      savedAt: new Date(),
    });

    return NextResponse.json({ message: 'Lead saved successfully' }, { status: 201 });
  } catch (error) {
    console.error('Save lead error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    await db.collection('saved_leads').deleteOne({ userId, postId });

    return NextResponse.json({ message: 'Lead removed' });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
