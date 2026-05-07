import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateReply } from '@/lib/gemini';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { title, text, productContext } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Post title is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // Atomically check and deduct credit
    const creditResult = await db.collection('users').findOneAndUpdate(
      { _id: userId, credits: { $gte: 1 } },
      { $inc: { credits: -1 } },
      { returnDocument: 'after' }
    );

    if (!creditResult) {
      return NextResponse.json({ error: 'Insufficient credits. Please upgrade your plan.' }, { status: 402 });
    }

    // Generate 3 reply variants
    const replies = await generateReply(title, text || '', productContext || '');

    // Log AI usage
    await db.collection('ai_usage').insertOne({
      userId,
      type: 'reply_generation',
      timestamp: new Date(),
    });

    return NextResponse.json({
      replies,
      creditsRemaining: creditResult.credits,
    });
  } catch (error) {
    console.error('Reply generation error:', error);

    try {
      const db = await getDb();
      await db.collection('logs').insertOne({
        type: 'error',
        action: 'reply_generation',
        error: error.message,
        userId: authResult.user.id,
        timestamp: new Date(),
      });
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 });
  }
}
