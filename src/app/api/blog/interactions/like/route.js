import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

    const db = await getDb();
    const userId = authResult.user.id;

    const existingLike = await db.collection('blog_likes').findOne({ articleId, userId });

    if (existingLike) {
      // Unlike
      await db.collection('blog_likes').deleteOne({ _id: existingLike._id });
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await db.collection('blog_likes').insertOne({ articleId, userId, createdAt: new Date() });
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

    const db = await getDb();
    const likesCount = await db.collection('blog_likes').countDocuments({ articleId });
    
    let likedByMe = false;
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      let userId = session.user.id;
      if (!userId && session.user.email) {
        const user = await db.collection('users').findOne({ email: session.user.email });
        if (user) userId = user._id.toString();
      }
      
      if (userId) {
        const existingLike = await db.collection('blog_likes').findOne({ articleId, userId });
        if (existingLike) likedByMe = true;
      }
    }

    return NextResponse.json({ count: likesCount, likedByMe });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
