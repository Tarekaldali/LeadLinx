import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  try {
    const { chatId } = await params;
    const db = await getDb();
    const chat = await db.collection('chats').findOne({ 
      _id: new ObjectId(chatId), 
      userId: new ObjectId(authResult.user.id) 
    });
    if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ chat });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PATCH(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  try {
    const { chatId } = await params;
    const body = await request.json();
    const db = await getDb();
    
    const updateFields = { updatedAt: new Date() };
    if (body.messages !== undefined) updateFields.messages = body.messages;
    if (body.title !== undefined) updateFields.title = body.title;

    await db.collection('chats').updateOne(
      { _id: new ObjectId(chatId), userId: new ObjectId(authResult.user.id) },
      { $set: updateFields }
    );
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  try {
    const { chatId } = await params;
    const db = await getDb();
    await db.collection('chats').deleteOne({ 
      _id: new ObjectId(chatId), 
      userId: new ObjectId(authResult.user.id) 
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
