import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    const user = await db.collection('users').findOne({ _id: new ObjectId(authResult.user.id) }, { projection: { role: 1 } });
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const days = searchParams.get('days') || '30';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let matchQuery = {};
    if (days !== '9999' && days !== 'all') {
      const since = new Date(Date.now() - parseInt(days) * 24 * 3600 * 1000);
      matchQuery.updatedAt = { $gte: since };
    }

    // Handle search by email, user ID, or chat ID
    if (search) {
      let isObjectId = false;
      try {
        if (search.length === 24) { new ObjectId(search); isObjectId = true; }
      } catch(e) {}

      // Find users matching email
      const users = await db.collection('users').find({ email: { $regex: search, $options: 'i' } }).toArray();
      const userIds = users.map(u => u._id);

      matchQuery.$or = [
        { userId: { $in: userIds } },
        { title: { $regex: search, $options: 'i' } }
      ];

      if (isObjectId) {
        matchQuery.$or.push({ _id: new ObjectId(search) });
        matchQuery.$or.push({ userId: new ObjectId(search) });
      }
    }

    const total = await db.collection('chats').countDocuments(matchQuery);
    
    // We can fetch messages, but for a list we might want to exclude them to save bandwidth, 
    // or just include the message count. The requirement says "Show complete chat history and metadata".
    // We will include messages but truncate very long ones if necessary, or just send them.
    const chats = await db.collection('chats')
      .find(matchQuery)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const userIdsToFetch = [...new Set(chats.map(c => c.userId?.toString()).filter(Boolean))];
    const usersFound = await db.collection('users').find({ _id: { $in: userIdsToFetch.map(id => new ObjectId(id)) } }).toArray();
    const userMap = Object.fromEntries(usersFound.map(u => [u._id.toString(), u]));

    return NextResponse.json({
      chats: chats.map(c => ({
        ...c,
        _id: c._id.toString(),
        userId: c.userId?.toString(),
        user: c.userId && userMap[c.userId.toString()] ? { email: userMap[c.userId.toString()].email, name: userMap[c.userId.toString()].name } : null,
        messageCount: c.messages?.length || 0
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Admin chats fetch error:', error);
    return NextResponse.json({ error: 'Failed to load chats' }, { status: 500 });
  }
}
