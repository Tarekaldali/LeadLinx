import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';

export const metadata = {
  title: 'Blog — Reddit Lead Generation Insights',
  description: 'Expert guides on finding customers on Reddit and AI-powered prospecting strategies.',
};

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  let posts = [];
  try {
    const db = await getDb();
    posts = await db.collection('blog')
      .find({ published: true })
      .sort({ date: -1 })
      .toArray();
    // Serialize MongoDB objects
    posts = posts.map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || p.content?.substring(0, 150) + '...',
      date: p.date ? new Date(p.date).toISOString().split('T')[0] : 'N/A',
      readTime: p.readTime || '5 min',
      category: p.category || 'General',
      image: p.image || null,
    }));
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
  }

  return (
    <div className="bg-white text-on-surface min-h-screen">
      <Navbar activePage="blog" />

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <header>
          <h1 className="font-display text-4xl mb-4 text-on-surface">LeadLinx Blog</h1>
          <p className="text-on-surface-variant text-lg">Expert guides on Reddit lead generation and AI-powered prospecting.</p>
        </header>

        {posts.length === 0 ? (
          <div className="bento-card p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">article</span>
            <h3 className="font-headline text-lg text-on-surface">No blog posts yet</h3>
            <p className="text-sm text-on-surface-variant">Check back soon for expert guides on lead generation.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block bento-card p-6 rounded-2xl hover:border-primary/20 transition-all group">
                <div className="flex gap-6">
                  {post.image && (
                    <div className="hidden md:block w-48 h-32 rounded-xl overflow-hidden bg-surface-container-low shrink-0">
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary-container/50 text-xs font-data-label text-primary border border-primary/10">{post.category}</span>
                      <span className="text-xs text-on-surface-variant font-data-label">{post.date}</span>
                      <span className="text-xs text-on-surface-variant font-data-label">{post.readTime} read</span>
                    </div>
                    <h2 className="font-headline text-xl group-hover:text-primary transition-colors mb-2 text-on-surface">{post.title}</h2>
                    <p className="text-on-surface-variant text-sm line-clamp-2">{post.excerpt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="bento-card p-8 text-center space-y-4">
          <h3 className="font-headline text-xl text-on-surface">Ready to put these strategies to work?</h3>
          <p className="text-on-surface-variant text-sm">LeadLinx automates everything you just read about.</p>
          <Link href="/signup" className="btn-primary inline-block">Start Free Trial</Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
