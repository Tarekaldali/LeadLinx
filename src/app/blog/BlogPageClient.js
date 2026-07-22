'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const DEFAULT_FEATURED_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwyvrN7Fj1-CX6RIoPlepSO5yCaA1Zu7n05FcJES5U37ycmdTa9SD9l4F2-8WnMJLge95-RCBVFn1lH__bUdsshsxJRSRlIKAAbSYmH_S4IVLEn71EOG0FA6j0bjxtOIDEIt_SwGtZHfEzOXsZekL0IC8DoYCx4nc92w6siSDvFQ2EWsc9nr418LJHKWKwPbTmfenFvJmKgRgCG-rrOqtUHHmZ7-yEo8JPTxpTfnCsYDDPYltYEV0LFw';
const DEFAULT_CARD_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMr0HAep7m0U3stUR9hmlB9mKvQmcQX0HqMhIkxI2NecK0lQEV9F8AA0VUuv0nco3IK5EHBEEWY1lbgRsEOH5_j6zydM0pSLk4o-VFnJBpw0eRKTfxAiJdlgdaU8-mtMa8n96s12OM-05GWGQnWRubuMZp4_yAC2pHhUSfu8ZN6-TnPRv-HDvRgGQSpARD5zsrs65klv_yOxvXdJ7feUKCbSSzVdcVS844bWr7mpi8NzT0BMon_7YF3A';

const ALL_CATEGORIES = ['All', 'AI', 'SEO', 'SaaS', 'Automation', 'Tutorials', 'Strategy', 'Tools', 'Growth', 'General'];

export default function BlogPageClient({ posts }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Derive the unique categories actually present in posts
  const availableCategories = useMemo(() => {
    const cats = new Set(posts.map((p) => p.category).filter(Boolean));
    return ['All', ...ALL_CATEGORIES.slice(1).filter((c) => cats.has(c)), ...Array.from(cats).filter((c) => !ALL_CATEGORIES.includes(c))];
  }, [posts]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return posts.filter((post) => {
      const matchesCategory = activeCategory === 'All' || post.category?.toLowerCase() === activeCategory.toLowerCase();
      const matchesQuery =
        !q ||
        post.title?.toLowerCase().includes(q) ||
        post.excerpt?.toLowerCase().includes(q) ||
        post.category?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [posts, query, activeCategory]);

  const featuredPost = filtered[0] || null;
  const recentPosts = filtered.slice(1);

  return (
    <>
      {/* ── Hero / Search / Filters ──────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 md:py-[100px] flex flex-col items-center justify-center text-center">
        <h1 className="font-h1-mobile md:font-h1 text-h1-mobile md:text-h1 text-on-background mb-4 max-w-3xl">
          Latest Guides, Tutorials &amp; AI Automation Articles
        </h1>
        <p className="text-secondary text-[17px] mb-12 max-w-2xl leading-relaxed">
          Insights and strategies to scale your B2B operations with advanced automation and intelligent workflows.
        </p>

        {/* Search */}
        <div className="w-full max-w-xl relative mb-10">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">search</span>
          <input
            className="w-full pl-12 pr-4 py-3.5 bg-surface border border-[#EEEEEE] rounded-xl text-sm text-on-surface placeholder:text-secondary outline-none focus:border-primary focus:ring-[4px] focus:ring-primary/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            placeholder="Search articles..."
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeCategory === cat
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface text-secondary border-[#EEEEEE] hover:border-primary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {(query || activeCategory !== 'All') && (
          <p className="mt-5 text-secondary text-sm">
            Showing <strong className="text-on-surface">{filtered.length}</strong> {filtered.length === 1 ? 'article' : 'articles'}
            {activeCategory !== 'All' ? ` in "${activeCategory}"` : ''}
            {query ? ` matching "${query}"` : ''}
          </p>
        )}
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 mb-20">
        <div className="bg-surface-container-lowest rounded-2xl border border-[#EEEEEE] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-1.5 z-10 text-center md:text-left">
            <h3 className="font-h3 text-[22px] font-bold text-on-background">Ready to automate your lead generation?</h3>
            <p className="text-secondary">Join 10,000+ B2B companies scaling their outreach with LeadLinx.</p>
          </div>
          <div className="z-10 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-8 py-3.5 rounded-xl hover:brightness-95 transition-all shadow-md whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Try LeadLinx Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── No results ───────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <section className="max-w-[1200px] mx-auto px-6 pb-32 text-center">
          <div className="py-24">
            <span className="material-symbols-outlined text-[64px] text-secondary/30 block mb-4">search_off</span>
            <h3 className="text-[22px] font-bold text-on-surface mb-2">No articles found</h3>
            <p className="text-secondary mb-6">Try a different keyword or category.</p>
            <button
              onClick={() => { setQuery(''); setActiveCategory('All'); }}
              className="bg-surface border border-[#EEEEEE] text-on-surface font-semibold px-6 py-3 rounded-xl hover:bg-surface-container-low transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </section>
      )}

      {/* ── Featured Article ──────────────────────────────────────────── */}
      {featuredPost && (
        <section className="max-w-[1200px] mx-auto px-6 mb-16">
          <Link href={`/blog/${featuredPost.slug}`}>
            <article className="bg-surface border border-[#EEEEEE] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.09)] transition-shadow duration-300 overflow-hidden group cursor-pointer">
              <div className="flex flex-col md:flex-row" style={{ minHeight: '420px' }}>
                {/* Image 60% */}
                <div className="w-full md:w-[60%] h-[260px] md:h-auto relative overflow-hidden bg-surface-container-low flex-shrink-0">
                  <Image
                    src={featuredPost.image || DEFAULT_FEATURED_IMG}
                    alt={featuredPost.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, 60vw"
                    priority
                    onError={(e) => { e.target.src = DEFAULT_FEATURED_IMG; }}
                  />
                  {/* Category badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-primary text-[11px] font-bold uppercase px-3 py-1.5 rounded-full shadow-sm">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>
                {/* Content 40% */}
                <div className="w-full md:w-[40%] p-8 md:p-10 flex flex-col justify-between bg-surface">
                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <span className="bg-primary/5 text-primary text-xs font-bold uppercase px-2.5 py-1 rounded-full">{featuredPost.category}</span>
                      <span className="text-secondary text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> 8 min read
                      </span>
                    </div>
                    <h2 className="text-[24px] md:text-[26px] font-bold leading-[1.25] text-on-background mb-4 group-hover:text-primary transition-colors duration-200">
                      {featuredPost.title}
                    </h2>
                    <p className="text-secondary text-[15px] leading-relaxed mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EEEEEE] pt-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-surface-container-high border border-[#EEEEEE] overflow-hidden relative flex-shrink-0">
                        <Image src={featuredPost.authorImage} alt={featuredPost.author} fill className="object-cover" sizes="36px" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-on-surface">{featuredPost.author}</div>
                        <div className="text-[11px] text-secondary">{featuredPost.date}</div>
                      </div>
                    </div>
                    <span className="text-primary text-sm font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read More <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </section>
      )}

      {/* ── Cards Grid ────────────────────────────────────────────────── */}
      {recentPosts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-6 mb-24">
          <h2 className="text-[20px] font-bold text-on-background mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full block" />
            Recent Publications
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug}`}>
                <article className="bg-surface border border-[#EEEEEE] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.09)] transition-all duration-300 overflow-hidden group flex flex-col cursor-pointer h-full">
                  <div className="relative overflow-hidden bg-surface-container-low" style={{ aspectRatio: '16/9' }}>
                    <Image
                      src={post.image || DEFAULT_CARD_IMG}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      onError={(e) => { e.target.src = DEFAULT_CARD_IMG; }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-primary text-[10px] font-bold uppercase px-2 py-1 rounded-full shadow-sm">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-[17px] font-bold text-on-background mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-secondary text-sm mb-4 line-clamp-2 leading-relaxed flex-grow">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-[#EEEEEE] pt-3">
                      <span className="text-secondary text-xs">{post.date}</span>
                      <span className="text-secondary text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> 8 min
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
