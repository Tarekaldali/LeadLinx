import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';
import { unstable_cache } from 'next/cache';
import Image from 'next/image';
import BlockRenderer from '@/components/cms/BlockRenderer';
import SubscribeForm from '@/components/blog/SubscribeForm';
import ShareMenu from '@/components/blog/ShareMenu';
import ArticleInteractions from '@/components/blog/ArticleInteractions';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const db = await getDb();
    const posts = await db.collection('blog').find({ $or: [{ published: true }, { status: 'Published' }] }).project({ slug: 1 }).toArray();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

const getCachedMeta = unstable_cache(
  async (slug) => {
    try {
      const db = await getDb();
      return await db.collection('blog').findOne({ slug, $or: [{ published: true }, { status: 'Published' }] }, {
        projection: { title: 1, seo: 1, excerpt: 1, hero: 1, image: 1, lastUpdated: 1, author: 1 }
      });
    } catch { return null; }
  },
  ['blog-meta'],
  { revalidate: 3600, tags: ['blog'] }
);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getCachedMeta(slug);
  if (!article) return { title: 'Article Not Found | LeadLinx Blog' };
  const title = article.seo?.metaTitle || article.title;
  const description = article.seo?.metaDescription || article.excerpt || 'LeadLinx Blog Article';
  const image = article.hero?.image || article.image;
  return {
    title: `${title} | LeadLinx Blog`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: 'article', title, description, url: `/blog/${slug}`, images: image ? [{ url: image }] : undefined },
  };
}

const getCachedArticle = unstable_cache(
  async (slug) => {
    try {
      const db = await getDb();
      let article = await db.collection('blog').findOne({ slug, $or: [{ published: true }, { status: 'Published' }] });
      let relatedPosts = [];
      if (article) {
        article = {
          ...article,
          _id: article._id.toString(),
          formattedDate: article.lastUpdated
            ? new Date(article.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : article.date
            ? new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : 'N/A',
        };
        const related = await db.collection('blog')
          .find({ slug: { $ne: slug }, $or: [{ published: true }, { status: 'Published' }] })
          .project({ slug: 1, title: 1, seo: 1, category: 1, lastUpdated: 1, date: 1, hero: 1, image: 1 })
          .sort({ lastUpdated: -1 })
          .limit(3)
          .toArray();
        relatedPosts = related.map((r) => ({
          slug: r.slug,
          title: r.title || r.seo?.metaTitle || 'Untitled',
          category: r.category || 'General',
          date: r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          image: r.hero?.image || r.image || null,
        }));
      }
      return { article, relatedPosts };
    } catch (error) {
      console.error('Blog post fetch error:', error);
      return { article: null, relatedPosts: [] };
    }
  },
  ['blog-article-v2'],
  { revalidate: 3600, tags: ['blog', 'blog-article-v2'] }
);

const FALLBACK_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB84Gij4EdBbaz_cyuIalBLTQQ7wTbi4PXxE9bYFVtO-4Kf6gH7_B5ra07Y2QEGEzN1jquKuxqrtD1p8zFEeWiGxE9Ojus-vgZ3WL-njLjFcSo7hzww_9G1JkcPeeJOI-V4bbZfb0MXK7hXs7I5o1Y-hV7r5rhoN6cWncGF9eYrPXtIw-sezbUds0OFoYquWugjPcJIWQDIX--fj_BHRnzmmGCED_6IBQSZyB-Gx1TC7-ECEsi1ZZMuuA';
const AUTHOR_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjvLjFzvdymVZnlQj1Cx1cks_Owq_mZF6zHdEypmXx8pD7YIIQtDcd-4tkbxMY42G_UpiTa-kqcWKUx51xykAdonJT1IyqZ92ZORySrpImRtWfFyjmCbarWiDEONHUQgKzkEgYTMp-NMNT7naQfloJZ7_SP8gq22K-jkKmdIvENLoL62NKzDu_Tz-oEU6AQ_bUbS_W5yQDp-Tdt6l_VcYYr71nTQ64zYqbuTK_u0IYAkQoX0F2xV6hoA';

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const { article, relatedPosts } = await getCachedArticle(slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <Navbar activePage="blog" />
        <div className="flex-1 flex items-center justify-center pt-[72px]">
          <div className="text-center max-w-md px-6">
            <span className="material-symbols-outlined text-[64px] text-secondary/30 block mb-4">article</span>
            <h1 className="text-[28px] font-bold mb-3 text-on-surface">Article Not Found</h1>
            <p className="text-secondary mb-6">This article may have been moved or unpublished.</p>
            <Link href="/blog" className="inline-flex items-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-xl hover:brightness-95 transition-all">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const faqs = (article.blocks || []).filter(b => b.type === 'faq' && Array.isArray(b.content)).flatMap(b => b.content);
  const tocBlocks = (article.blocks || []).filter(b => b.type === 'h2');
  const heroImage = article.hero?.image || article.image || FALLBACK_IMG;

  const breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://leadlinx.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://leadlinx.com/blog' },
      { '@type': 'ListItem', position: 3, name: article.title, item: `https://leadlinx.com/blog/${article.slug}` },
    ],
  };

  const articleSchema = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
    image: heroImage,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Organization', name: 'LeadLinx Intelligence' },
    publisher: { '@type': 'Organization', name: 'LeadLinx', logo: { '@type': 'ImageObject', url: 'https://leadlinx.com/logo.png' } },
  };

  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
  } : null;

  const authorName = article.author?.name || 'Sarah Jenkins';
  const authorRole = article.author?.role || 'Content Strategist';
  const authorBio = article.author?.bio || 'B2B growth and automation specialist at LeadLinx, helping companies scale their pipeline.';
  const authorImage = article.author?.image || AUTHOR_IMG;
  const currentUrl = `https://leadlinx.com/blog/${article.slug}`;

  return (
    <div className="bg-[#FAFAFA] text-on-surface font-body-md antialiased min-h-screen flex flex-col">
      <Navbar activePage="blog" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="w-full pt-[72px] bg-surface border-b border-[#EEEEEE]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-secondary text-sm mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface truncate max-w-[300px]">{article.title}</span>
          </nav>

          {/* Category tag */}
          <div className="inline-flex items-center gap-1.5 bg-primary/5 text-primary text-xs font-bold uppercase px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {article.category || 'Article'}
          </div>

          {/* Title */}
          <h1 className="text-[30px] md:text-[42px] font-bold leading-[1.15] text-on-surface mb-6 max-w-[820px]">
            {article.title}
          </h1>

          {/* Author row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#EEEEEE] relative flex-shrink-0 bg-surface-container">
                <Image src={authorImage} alt={authorName} fill sizes="44px" className="object-cover" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-on-surface">{authorName}</div>
                <div className="text-[13px] text-secondary">{article.formattedDate} · 8 min read</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShareMenu url={currentUrl} title={article.title} />
            </div>
          </div>
        </div>

        {/* Full-width hero image */}
        <div className="max-w-[1200px] mx-auto px-6 pb-0">
          <div className="w-full aspect-[21/9] md:aspect-[3/1] relative overflow-hidden rounded-t-2xl border border-b-0 border-[#EEEEEE] bg-surface-container-low">
            <Image
              src={heroImage}
              alt={article.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────── */}
      <main className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 w-full flex-grow">

        {/* Left: Table of Contents (sticky) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-[90px]">
            <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-5 shadow-sm">
              <h4 className="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 pb-3 border-b border-[#EEEEEE]">Contents</h4>
              <nav className="space-y-1">
                {tocBlocks.length > 0 ? (
                  tocBlocks.map((b, idx) => (
                    <a
                      key={b.id}
                      href={`#h-${b.id}`}
                      className="flex items-start gap-2 py-1.5 text-sm text-secondary hover:text-primary transition-colors group"
                    >
                      <span className="text-primary/30 group-hover:text-primary font-mono text-[11px] mt-0.5 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="leading-snug line-clamp-2">{b.content}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-secondary text-sm">No headings found.</p>
                )}
              </nav>
            </div>

            {/* Author card */}
            <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-5 shadow-sm mt-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#EEEEEE] relative flex-shrink-0 bg-surface-container">
                  <Image src={authorImage} alt={authorName} fill sizes="40px" className="object-cover" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-on-surface">{authorName}</div>
                  <div className="text-[12px] text-secondary">{authorRole}</div>
                </div>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed">{authorBio}</p>
            </div>
          </div>
        </aside>

        {/* Center: Article body */}
        <article className="col-span-1 lg:col-span-6">
          <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-6 md:p-10 shadow-sm">
            {/* Excerpt (if available) */}
            {article.excerpt && (
              <div className="bg-primary/5 border-l-4 border-primary rounded-r-xl px-5 py-4 mb-8 text-on-surface font-medium leading-relaxed">
                {article.excerpt}
              </div>
            )}

            <div className="prose-article">
              {article.blocks && article.blocks.length > 0 ? (
                <BlockRenderer blocks={article.blocks} />
              ) : article.content ? (
                <div
                  className="prose prose-lg max-w-none text-on-surface leading-relaxed prose-headings:text-on-surface prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              ) : (
                <p className="text-secondary text-center py-12">No content yet.</p>
              )}
              
              {/* Interactions (Likes & Comments) */}
              <ArticleInteractions articleId={article._id.toString()} />
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <span className="text-secondary text-sm font-semibold">Tags:</span>
              {article.tags.map((tag) => (
                <span key={tag} className="bg-surface border border-[#EEEEEE] text-secondary text-xs font-semibold px-3 py-1.5 rounded-full hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-10">
              <h3 className="text-[20px] font-bold text-on-surface mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full block" />
                More Articles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedPosts.map((rp) => (
                  <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group">
                    <div className="bg-surface rounded-xl border border-[#EEEEEE] overflow-hidden hover:shadow-md transition-all">
                      <div className="aspect-[16/9] relative overflow-hidden bg-surface-container-low">
                        {rp.image ? (
                          <Image src={rp.image} alt={rp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="300px" />
                        ) : (
                          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-secondary/30">article</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <span className="text-[10px] font-bold uppercase text-primary mb-1 block">{rp.category}</span>
                        <h4 className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">{rp.title}</h4>
                        <span className="text-[11px] text-secondary mt-1 block">{rp.date}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Right: Sticky sidebar widgets */}
        <aside className="col-span-1 lg:col-span-3">
          <div className="sticky top-[90px] space-y-5">
            {/* CTA */}
            <div className="bg-gradient-to-br from-primary/90 to-primary rounded-2xl p-6 text-center text-on-primary shadow-lg">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
              </div>
              <h4 className="text-[18px] font-bold mb-2">Automate Outreach</h4>
              <p className="text-on-primary/80 text-sm mb-5 leading-relaxed">Get started with LeadLinx today and see results in days, not months.</p>
              <Link
                href="/login"
                className="block w-full bg-white text-primary font-bold py-3 rounded-xl hover:bg-white/90 transition-colors text-sm shadow-md"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Popular Articles */}
            {relatedPosts.length > 0 && (
              <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-5 shadow-sm">
                <h4 className="text-[14px] font-bold text-on-surface mb-4 pb-3 border-b border-[#EEEEEE] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>
                  Popular Resources
                </h4>
                <ul className="space-y-4">
                  {relatedPosts.slice(0, 2).map((rp) => (
                    <li key={rp.slug}>
                      <Link href={`/blog/${rp.slug}`} className="flex gap-3 group items-start">
                        <div className="w-[52px] h-[52px] rounded-lg overflow-hidden border border-[#EEEEEE] flex-shrink-0 relative bg-surface-container-low">
                          {rp.image ? (
                            <Image src={rp.image} alt={rp.title} fill className="object-cover" sizes="52px" />
                          ) : (
                            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                              <span className="material-symbols-outlined text-[20px] text-secondary/50">article</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-primary mb-0.5">{rp.category}</div>
                          <h5 className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">{rp.title}</h5>
                          <span className="text-[11px] text-secondary">{rp.date}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Newsletter */}
            <SubscribeForm />
          </div>
        </aside>
      </main>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-[#EEEEEE] bg-surface py-20">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-[32px] font-bold text-on-surface mb-3">Ready to automate? Start free today.</h2>
          <p className="text-secondary text-[17px] mb-8 max-w-lg mx-auto">Join the leading platform for automated B2B pipeline generation. No credit card required.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-8 py-3.5 rounded-xl hover:brightness-95 transition-all shadow-md">
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Start Free Trial
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 bg-surface text-on-surface border border-[#EEEEEE] font-semibold px-8 py-3.5 rounded-xl hover:bg-surface-container-low transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .prose-article { color: var(--color-on-surface); }
        .prose-article p { margin-bottom: 1.25rem; line-height: 1.8; }
        .prose-article h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: var(--color-on-surface); }
        .prose-article h3 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--color-on-surface); }
        .prose-article ul { list-style: disc; padding-left: 1.75rem; margin-bottom: 1.25rem; }
        .prose-article ol { list-style: decimal; padding-left: 1.75rem; margin-bottom: 1.25rem; }
        .prose-article li { margin-bottom: 0.4rem; line-height: 1.7; }
        .prose-article a { color: var(--color-primary); text-decoration: none; }
        .prose-article a:hover { text-decoration: underline; }
        .prose-article strong { font-weight: 700; }
        .prose-article blockquote { border-left: 4px solid var(--color-primary); padding-left: 1rem; color: #555; font-style: italic; margin: 1.5rem 0; }
        .prose-article code { background: #f4f4f4; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.875em; }
      `}</style>

      <Footer />
    </div>
  );
}
