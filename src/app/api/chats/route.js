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
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const chat = {
      userId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('chats').insertOne(chat);
    return NextResponse.json({ chatId: result.insertedId.toString(), chat: { ...chat, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
