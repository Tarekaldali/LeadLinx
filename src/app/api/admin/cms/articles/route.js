import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import crypto from 'crypto';

export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const db = await getDb();
    
    // We fetch articles (the new collection specifically for CMS, or reuse 'blog')
    // We'll use 'blog' to be compatible with existing frontend if possible, but map fields.
    const articles = await db.collection('blog')
      .find({}, { projection: { blocks: 0 } }) // don't load huge blocks for list
      .sort({ lastUpdated: -1, date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection('blog').countDocuments();

    return NextResponse.json({
      articles: articles.map(a => ({ ...a, _id: a._id.toString() })),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin CMS articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();
    const newArticle = {
      title: 'Untitled Article',
      slug: `untitled-${crypto.randomBytes(4).toString('hex')}`,
      excerpt: '',
      category: 'General',
      tags: [],
      author: 'Admin',
      readTime: '1 min',
      publishDate: null,
      lastUpdated: new Date(),
      featured: false,
      status: 'Draft',
      hero: {
        image: '',
        alt: '',
        titleOverride: '',
        subtitleOverride: '',
        socialSharing: true
      },
      seo: {
        metaTitle: '',
        metaDescription: '',
        focusKeyword: '',
        canonicalUrl: '',
        robots: 'index, follow',
        openGraphImage: ''
      },
      blocks: [],
      sidebar: {
        popularPosts: true,
        newsletter: true,
        ctaCard: true,
        sticky: true
      },
      createdAt: new Date(),
      // Legacy compatibility for existing frontends
      published: false,
      date: new Date().toISOString().split('T')[0]
    };

    const result = await db.collection('blog').insertOne(newArticle);
    
    try {
      revalidateTag('blog');
      revalidateTag('blog-posts-list-v2');
      revalidatePath('/blog');
    } catch (e) {
      console.error('Failed to revalidate cache:', e);
    }

    return NextResponse.json({ 
      message: 'Article created', 
      articleId: result.insertedId.toString() 
    });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
