import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// PUT: Update a blog post
export async function PUT(request, { params }) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const p = await params;
    const body = await request.json();
    const { title, content, image, slug, category, sections, published } = body;

    const db = await getDb();

    const updateFields = { updatedAt: new Date() };
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) {
      updateFields.content = content;
      // Recalculate read time and excerpt
      const wordCount = content.split(/\s+/).length;
      updateFields.readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min`;
      updateFields.excerpt = content.substring(0, 160).replace(/\n/g, ' ').trim() + '...';
    }
    if (image !== undefined) updateFields.image = image;
    if (slug !== undefined) updateFields.slug = slug;
    if (category !== undefined) updateFields.category = category;
    if (sections !== undefined) updateFields.sections = sections;
    if (published !== undefined) updateFields.published = published;

    const result = await db.collection('blog').updateOne(
      { _id: new ObjectId(p.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Blog post updated successfully' });
  } catch (error) {
    console.error('Admin blog update error:', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

// DELETE: Delete a blog post
export async function DELETE(request, { params }) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const p = await params;
    const db = await getDb();

    const result = await db.collection('blog').deleteOne({ _id: new ObjectId(p.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Admin blog delete error:', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
