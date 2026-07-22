import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const db = await getDb();
    const article = await db.collection('blog').findOne({ _id: new ObjectId(id) });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article: { ...article, _id: article._id.toString() } });
  } catch (error) {
    console.error('Fetch article error:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

import { revalidatePath, revalidateTag } from 'next/cache';

export async function PUT(request, { params }) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const updateData = await request.json();
    
    // Remove _id from update payload if it exists
    delete updateData._id;

    // Update timestamps
    updateData.lastUpdated = new Date();
    
    // Legacy mapping
    if (updateData.status === 'Published') {
      updateData.published = true;
      if (!updateData.publishDate) {
        updateData.publishDate = new Date();
        updateData.date = new Date().toISOString().split('T')[0];
      }
    } else {
      updateData.published = false;
    }

    // Mapping hero image to top-level image field for legacy frontend support
    if (updateData.hero && updateData.hero.image) {
      updateData.image = updateData.hero.image;
    }

    const db = await getDb();
    const result = await db.collection('blog').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    try {
      revalidateTag('blog');
      revalidateTag('blog-posts-list-v2');
      revalidateTag('blog-article-v2');
      revalidatePath('/blog');
      revalidatePath('/blog/[slug]', 'page');
    } catch (e) {
      console.error('Failed to revalidate cache:', e);
    }

    return NextResponse.json({ message: 'Article updated successfully' });
  } catch (error) {
    console.error('Update article error:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.collection('blog').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    try {
      revalidateTag('blog');
      revalidateTag('blog-posts-list-v2');
      revalidateTag('blog-article-v2');
      revalidatePath('/blog');
      revalidatePath('/blog/[slug]', 'page');
    } catch (e) {
      console.error('Failed to revalidate cache:', e);
    }

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
