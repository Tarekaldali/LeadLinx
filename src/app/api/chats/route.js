import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET /api/chats — list user's chats
export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const chats = await db.collection('chats')
      .find({ userId }, { projection: { messages: 0 } }) // exclude messages for list view
      .sort({ updatedAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('List chats error:', error);
    return NextResponse.json({ error: 'Failed to load chats' }, { status: 500 });
  }
}

// POST /api/chats — create a new chat
export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    let initialQuery = '';
    try {
      const body = await request.json();
      if (body.initialQuery) initialQuery = body.initialQuery;
    } catch (e) {
      // Body might be empty
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    let title = 'New Chat';
    if (initialQuery) {
      title = initialQuery.length > 35 ? initialQuery.substring(0, 32) + '...' : initialQuery;
    }

    const chat = {
      userId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('chats').insertOne(chat);

    // Ensure it shows up in Chat Cost & Profit page immediately
    await db.collection('ai_usage').insertOne({
      userId,
      chatId: result.insertedId,
      type: 'chat',
      query: initialQuery || 'New Chat Created',
      totalUsage: { prompt_tokens: 0, completion_tokens: 0 },
      rawCostUsd: 0,
      totalCostUsd: 0,
      profitUsd: 0,
      creditsCharged: 0,
      leadsReturned: 0,
      postsAnalyzed: 0,
      timestamp: new Date()
    });

    return NextResponse.json({ chatId: result.insertedId.toString(), chat: { ...chat, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
