import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

// GET: List all blog posts (admin view - includes unpublished)
export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();
    const posts = await db.collection('blog')
      .find({})
      .sort({ date: -1 })
      .toArray();

    // Serialize ObjectIds
    const serialized = posts.map(p => ({
      ...p,
      _id: p._id.toString(),
    }));

    return NextResponse.json({ posts: serialized });
  } catch (error) {
    console.error('Admin blog list error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

// POST: Create a new blog post
export async function POST(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { title, content, image, slug, category, sections } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const db = await getDb();

    // Auto-generate slug if not provided
    const postSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await db.collection('blog').findOne({ slug: postSlug });
    if (existing) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }

    // Estimate read time
    const wordCount = content.split(/\s+/).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min`;

    // Generate excerpt
    const excerpt = content.substring(0, 160).replace(/\n/g, ' ').trim() + '...';

    const post = {
      title,
      content,
      sections: sections || null,
      image: image || null,
      slug: postSlug,
      category: category || 'General',
      excerpt,
      readTime,
      published: true,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: authResult.user.id,
    };

    const result = await db.collection('blog').insertOne(post);

    return NextResponse.json({
      message: 'Blog post created successfully',
      post: { ...post, _id: result.insertedId.toString() },
    }, { status: 201 });
  } catch (error) {
    console.error('Admin blog create error:', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
