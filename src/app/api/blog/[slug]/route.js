import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET: Fetch a single published blog post by slug
export async function GET(request, { params }) {
  try {
    const p = await params;
    const db = await getDb();
    const post = await db.collection('blog').findOne({ slug: p.slug, published: true });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      post: {
        ...post,
        _id: post._id.toString(),
      },
    });
  } catch (error) {
    console.error('Blog post fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}
