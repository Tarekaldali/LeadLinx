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

    const postId = lead._id || lead.id || new ObjectId().toString();

    // Check if already saved
    const existing = await db.collection('saved_leads').findOne({
      userId,
      postId: postId,
    });

    if (existing) {
      // If it exists, let's update it instead so status changes sync!
      await db.collection('saved_leads').updateOne(
        { _id: existing._id },
        { $set: { status: lead.status || existing.status || 'New', notes: lead.notes || existing.notes } }
      );
      return NextResponse.json({ message: 'Lead updated in pipeline' }, { status: 200 });
    }

    await db.collection('saved_leads').insertOne({
      userId,
      postId: postId,
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
      status: lead.status || 'New',
      emails: lead.emails || [],
      phones: lead.phones || [],
      socials: lead.socials || [],
      suggestedReply: lead.suggestedReply,
      savedAt: new Date(),
    });

    // Increment global platform counter for landing page stats
    await db.collection('platform_stats').updateOne(
      { _id: 'global' },
      { $inc: { totalLeadsExtracted: 1 } },
      { upsert: true }
    );

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
