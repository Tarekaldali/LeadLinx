import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

    const db = await getDb();
    const comments = await db.collection('blog_comments')
      .find({ articleId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ comments });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { articleId, text } = await request.json();
    if (!articleId || !text || !text.trim()) {
      return NextResponse.json({ error: 'Article ID and text required' }, { status: 400 });
    }

    const db = await getDb();
    
    const newComment = {
      articleId,
      userId: authResult.user.id,
      userName: authResult.user.name || 'Anonymous',
      userImage: authResult.user.image || null,
      text: text.trim(),
      createdAt: new Date()
    };

    const result = await db.collection('blog_comments').insertOne(newComment);
    newComment._id = result.insertedId;

    return NextResponse.json({ comment: newComment });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
