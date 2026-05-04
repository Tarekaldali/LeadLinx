import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET: Public - fetch all published blog posts
export async function GET() {
  try {
    const db = await getDb();
    const posts = await db.collection('blog')
      .find({ published: true })
      .sort({ date: -1 })
      .project({ content: 0, sections: 0 })
      .toArray();

    const serialized = posts.map(p => ({
      ...p,
      _id: p._id.toString(),
    }));

    return NextResponse.json({ posts: serialized });
  } catch (error) {
    console.error('Blog list error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}
