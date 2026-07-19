import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';
import Image from 'next/image';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const p = await params;
  let article = null;
  try {
    const db = await getDb();
    article = await db.collection('blog').findOne({ slug: p.slug, published: true });
  } catch { /* fallback */ }

  if (!article) return { title: 'Article Not Found' };
  return {
    title: article.title,
    description: article.excerpt || article.content?.substring(0, 160),
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt || article.content?.substring(0, 160),
      images: article.image ? [{ url: article.image }] : undefined,
    },
    other: {
      'article:published_time': article.date ? new Date(article.date).toISOString() : undefined,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const p = await params;

  let article = null;
  let relatedPosts = [];
  try {
    const db = await getDb();
    article = await db.collection('blog').findOne({ slug: p.slug, published: true });
    if (article) {
      // Serialize
      article = {
        ...article,
        _id: article._id.toString(),
        date: article.date ? new Date(article.date).toISOString().split('T')[0] : 'N/A',
      };
      // Get related posts
      const related = await db.collection('blog')
        .find({ slug: { $ne: p.slug }, published: true })
        .sort({ date: -1 })
        .limit(3)
        .toArray();
      relatedPosts = related.map(r => ({
        slug: r.slug,
        title: r.title,
      }));
    }
  } catch (error) {
    console.error('Blog post fetch error:', error);
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-4 text-on-surface">Article Not Found</h1>
          <Link href="/blog" className="text-primary hover:underline">Back to Blog</Link>
        </div>
      </div>
    );
  }

  // Parse sections if stored as JSON array, otherwise treat content as a single block
  let sections = [];
  if (article.sections && Array.isArray(article.sections)) {
    sections = article.sections;
  } else if (article.content) {
    sections = [{ heading: null, content: article.content }];
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar activePage="blog" />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/blog" className="text-primary text-sm hover:underline mb-8 inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Blog
        </Link>
        
        <article className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            {article.category && (
              <span className="px-2.5 py-0.5 rounded-lg bg-primary-container/50 text-xs font-data-label text-primary border border-primary/10">{article.category}</span>
            )}
            <span className="text-xs text-on-surface-variant font-data-label">{article.date}</span>
            {article.readTime && (
              <span className="text-xs text-on-surface-variant font-data-label">{article.readTime} read</span>
            )}
          </div>

          {article.image && (
            <div className="w-full h-64 rounded-2xl overflow-hidden mb-8 bg-surface-container-low relative">
              <Image src={article.image} alt={article.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <h1 className="font-display text-3xl md:text-4xl mb-8 text-on-surface leading-tight">{article.title}</h1>
          
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <h2 className="font-headline text-xl mb-4 text-on-surface">{section.heading}</h2>
                )}
                <div className="text-on-surface-variant leading-relaxed whitespace-pre-line text-[15px]">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="mt-12 p-6 bg-surface-container-low rounded-xl border border-border-glass">
              <h3 className="font-headline text-lg mb-4 text-on-surface">Related Articles</h3>
              <div className="space-y-2">
                {relatedPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="flex items-center gap-2 text-primary text-sm hover:underline">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* CTA */}
        <div className="mt-16 bento-card p-8 text-center space-y-4">
          <h3 className="font-headline text-xl text-on-surface">Automate your Reddit lead generation</h3>
          <p className="text-on-surface-variant text-sm">LeadLinx uses AI to find the leads described in this article. Try it free.</p>
          <Link href="/login" className="btn-primary inline-block">Start Free Trial</Link>
        </div>

        {/* Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article.title,
              description: article.excerpt || article.content?.substring(0, 160),
              datePublished: article.date,
              author: { '@type': 'Organization', name: 'LeadLinx Intelligence' },
              publisher: { '@type': 'Organization', name: 'LeadLinx' },
            }),
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
