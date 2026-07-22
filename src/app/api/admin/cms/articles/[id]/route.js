import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

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

    // Auto-migrate legacy articles to the new CMS structure for the frontend
    if (!article.blocks && article.content) {
      article.blocks = [
        {
          id: `legacy_content_${Date.now()}`,
          type: 'html', // Use HTML block to preserve legacy formatting safely
          content: article.content
        }
      ];
    }
    
    // Ensure default structures exist so the UI doesn't crash on old articles
    if (!article.hero) {
      article.hero = { image: article.image || '', alt: '', titleOverride: '', subtitleOverride: '', socialSharing: true };
    }
    if (!article.seo) {
      article.seo = { metaTitle: '', metaDescription: '', focusKeyword: '', canonicalUrl: '', robots: 'index, follow', openGraphImage: '' };
    }
    if (!article.status) {
      article.status = article.published ? 'Published' : 'Draft';
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
    const existingArticle = await db.collection('blog').findOne({ _id: new ObjectId(id) });
    
    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isNewlyPublished = existingArticle.status !== 'Published' && updateData.status === 'Published';

    const result = await db.collection('blog').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    try {
      revalidateTag('blog');
      revalidateTag('blog-posts-list-v2');
      revalidateTag('blog-article-v2');
      revalidatePath('/blog');
      revalidatePath('/blog/[slug]', 'page');
    } catch (e) {
      console.error('Failed to revalidate cache:', e);
    }

    if (isNewlyPublished) {
      // Send email to subscribers asynchronously without blocking the response
      sendNewPostEmail(updateData.title, updateData.slug, updateData.excerpt).catch(err => {
        console.error('Failed to send newsletter:', err);
      });
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

async function sendNewPostEmail(title, slug, excerpt) {
  try {
    const db = await getDb();
    const subscribers = await db.collection('subscribers').find({ status: 'active' }).toArray();
    
    if (subscribers.length === 0) return;

    // Check for SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Newsletter] SMTP credentials not configured. Skipping email send. Subscribers to notify:', subscribers.length);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const postUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadlinx.com'}/blog/${slug}`;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #000;">New Article from LeadLinx</h2>
        <h3>${title}</h3>
        <p>${excerpt || 'Check out our latest insights on B2B sales automation.'}</p>
        <div style="margin-top: 30px;">
          <a href="${postUrl}" style="background-color: #0A66C2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Read Article</a>
        </div>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999;">You received this email because you subscribed to the LeadLinx Blog.</p>
      </div>
    `;

    // Send emails (Using bcc to protect privacy)
    const emails = subscribers.map(s => s.email);
    
    await transporter.sendMail({
      from: `"LeadLinx Blog" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_FROM || process.env.SMTP_USER, // Send to self
      bcc: emails, // BCC all subscribers
      subject: `New Post: ${title}`,
      html: htmlContent,
    });
    
    console.log(`[Newsletter] Successfully sent new post email to ${emails.length} subscribers.`);
  } catch (error) {
    console.error('[Newsletter] Error sending emails:', error);
  }
}

