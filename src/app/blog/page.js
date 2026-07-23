import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';
import { unstable_cache } from 'next/cache';
import BlogPageClient from './BlogPageClient';

export const metadata = {
  title: 'LeadLinx Blog | Insights, Guides & AI Automation Articles',
  description: 'Insights and strategies to scale your B2B operations with advanced automation and intelligent workflows.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: 'LeadLinx Blog | Insights, Guides & AI Automation Articles',
    description: 'Insights and strategies to scale your B2B operations with advanced automation and intelligent workflows.',
  }
};

export const revalidate = 3600;

const getCachedBlogPosts = unstable_cache(
  async () => {
    try {
      const db = await getDb();
      const posts = await db.collection('blog')
        .find({ $or: [{ published: true }, { status: 'Published' }] })
        .project({ slug: 1, title: 1, seo: 1, excerpt: 1, lastUpdated: 1, date: 1, category: 1, hero: 1, image: 1, readTime: 1 })
        .sort({ lastUpdated: -1, date: -1 })
        .toArray();

      return posts.map((p) => ({
        _id: p._id.toString(),
        slug: p.slug,
        title: p.title || p.seo?.metaTitle || 'Untitled',
        excerpt: p.excerpt || p.seo?.metaDescription || 'Read our latest insights and strategies.',
        date: p.lastUpdated
          ? new Date(p.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : p.date
          ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '',
        category: p.category || 'General',
        readTime: p.readTime || 8,
        image: p.hero?.image || p.image || null,
        author: 'Sarah Jenkins',
        authorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnkcGFpWhmT2KUw6BE9RQKCnAgEWyodTY5vSJjNFZoTdl4HKNyWbCiqsgxLOqHTI5fR10rOpd4COTrQZtCTJwOMXHzr5NhehiHx6nrMqTMe4HU0uNtNbLzmIi64pFhLiRxLgv7iDEHbPemMdkPrQbd1DYNTo9TkaEWefxTJIvDtkFuYZDRW9wf5Y8tYaIqKOlzLO99kA1kgo-HhDR07gcrSze-zAWwUbKuKk240EUa7_EUPl6zUdpV0A',
      }));
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      return [];
    }
  },
  ['blog-posts-list-v2'],
  { revalidate: 3600, tags: ['blog'] }
);

export default async function BlogPage() {
  const posts = await getCachedBlogPosts();

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col">
      <Navbar activePage="blog" />
      <main className="w-full flex-grow pt-[72px]">
        <BlogPageClient posts={posts} />
      </main>
      <Footer />
    </div>
  );
}
