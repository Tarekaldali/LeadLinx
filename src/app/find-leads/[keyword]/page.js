import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const keywordData = {
  'crm-alternatives': { title: 'CRM Alternatives', subreddits: ['SaaS', 'smallbusiness', 'sales'], description: 'Users actively looking for CRM alternatives often express frustration with pricing, complexity, or missing features. These are high-intent buyers ready to switch.' },
  'aws-costs': { title: 'AWS Costs', subreddits: ['devops', 'aws', 'startups'], description: 'Companies struggling with AWS bills are actively seeking cost optimization tools and cheaper hosting alternatives.' },
  'lead-generation': { title: 'Lead Generation', subreddits: ['marketing', 'entrepreneur', 'sales'], description: 'Sales teams searching for lead generation solutions represent the highest buying intent segment on Reddit.' },
  'project-management': { title: 'Project Management', subreddits: ['projectmanagement', 'agile', 'startup'], description: 'Teams looking for project management tools are evaluating options and ready to invest in solutions.' },
  'email-marketing': { title: 'Email Marketing', subreddits: ['marketing', 'emailmarketing', 'entrepreneur'], description: 'Marketers seeking email tools are comparing features, pricing, and deliverability across platforms.' },
  'analytics-tools': { title: 'Analytics Tools', subreddits: ['analytics', 'webdev', 'marketing'], description: 'Data-driven teams seeking analytics solutions represent a sophisticated, high-budget buyer segment.' },
};

export async function generateMetadata({ params }) {
  const p = await params;
  const keyword = p.keyword.replace(/-/g, ' ');
  const capitalizedKeyword = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const data = keywordData[p.keyword];
  
  return {
    title: `Find ${capitalizedKeyword} Leads on Reddit — AI-Powered Lead Generation`,
    description: data?.description || `Stop manually searching Reddit for ${keyword} leads. LeadLinx uses AI to scan thousands of relevant subreddits in real-time, detecting buying intent automatically.`,
    keywords: [`${keyword} leads`, `reddit ${keyword}`, `find ${keyword} customers`, 'reddit lead generation', 'AI lead scoring'],
    alternates: {
      canonical: `/find-leads/${p.keyword}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(keywordData).map(keyword => ({ keyword }));
}

export default async function ProgrammaticSEOPage({ params }) {
  const p = await params;
  const keyword = p.keyword.replace(/-/g, ' ');
  const capitalizedKeyword = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const data = keywordData[p.keyword] || {};
  const subreddits = data.subreddits || ['SaaS', 'entrepreneur', 'marketing'];
  
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How does LeadLinx find ${keyword} leads?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `LeadLinx uses advanced AI to continuously monitor Reddit for conversations related to ${keyword}. We filter out noise and only present you with high-intent users actively discussing or seeking solutions in your niche.`,
        },
      },
      {
        '@type': 'Question',
        name: `Why is Reddit good for ${keyword} prospecting?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Reddit is where authentic, unfiltered conversations happen. People turn to Reddit when they are frustrated with current tools or seeking genuine recommendations, making it a goldmine for ${keyword} lead generation if you can find the signals among the noise.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I automate outreach?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `While LeadLinx automatically generates personalized, context-aware reply drafts using AI, we encourage you to review and post them manually to maintain the authentic, non-spammy engagement that Reddit users value.`,
        },
      },
    ],
  };

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/50 border border-primary/10 text-xs font-data-label text-primary">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI-POWERED LEAD DISCOVERY
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-on-surface leading-tight">
            Find <span className="text-primary">{capitalizedKeyword}</span> Leads on Reddit
          </h1>
          <p className="text-on-surface-variant text-xl max-w-2xl mx-auto">
            {data.description || `Stop manually searching Reddit for ${keyword} leads. LeadLinx uses AI to scan thousands of relevant subreddits in real-time, detecting buying intent automatically.`}
          </p>
          <div className="pt-4">
            <Link href="/login" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
              Start Finding {capitalizedKeyword} Leads
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-6">
          <h2 className="font-headline text-2xl text-on-surface text-center">How LeadLinx Finds {capitalizedKeyword} Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: 'radar', title: 'Scan Reddit', desc: `Our AI monitors ${subreddits.map(s => `r/${s}`).join(', ')} and 50+ subreddits for ${keyword} discussions in real-time.` },
              { icon: 'psychology', title: 'Score Intent', desc: `Each post is analyzed for buying signals and scored 1-10. Only leads scoring 7+ are shown — no noise.` },
              { icon: 'auto_awesome', title: 'Generate Reply', desc: `AI drafts a helpful, non-spammy reply that provides value first. Copy, paste, and engage authentically.` },
            ].map((step, i) => (
              <div key={i} className="bento-card p-6 rounded-2xl text-center">
                <h3 className="font-headline text-base mb-2 text-on-surface">{step.title}</h3>
                <p className="text-sm text-on-surface-variant">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Target Subreddits */}
        <section className="bento-card p-6 md:p-8 rounded-2xl">
          <h2 className="font-headline text-xl mb-4 text-on-surface">Best Subreddits for {capitalizedKeyword} Leads</h2>
          <div className="flex flex-wrap gap-3">
            {subreddits.map((sub, i) => (
              <span key={i} className="px-4 py-2 rounded-xl bg-secondary-container/30 text-secondary text-sm font-medium border border-secondary/10">
                r/{sub}
              </span>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant mt-4">
            LeadLinx also monitors related subreddits based on your keywords to find leads you might miss manually.
          </p>
        </section>

        {/* FAQ */}
        <section className="bento-card p-6 md:p-8 rounded-2xl space-y-6">
          <h2 className="font-headline text-2xl text-on-surface">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-on-surface text-lg">How does LeadLinx find {keyword} leads?</h3>
              <p className="text-on-surface-variant text-sm mt-1">LeadLinx uses advanced AI to continuously monitor Reddit for conversations related to {keyword}. We filter out noise and only present you with high-intent users actively discussing or seeking solutions in your niche.</p>
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-lg">Why is Reddit good for {keyword} prospecting?</h3>
              <p className="text-on-surface-variant text-sm mt-1">Reddit is where authentic, unfiltered conversations happen. People turn to Reddit when they are frustrated with current tools or seeking genuine recommendations, making it a goldmine for {keyword} lead generation if you can find the signals among the noise.</p>
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-lg">Can I automate outreach?</h3>
              <p className="text-on-surface-variant text-sm mt-1">While LeadLinx automatically generates personalized, context-aware reply drafts using AI, we encourage you to review and post them manually to maintain the authentic, non-spammy engagement that Reddit users value.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bento-card p-8 md:p-12 text-center space-y-6 bg-primary-container/20 border-primary/10">
          <h2 className="font-headline text-2xl text-on-surface">Ready to find {capitalizedKeyword} leads automatically?</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            Join 500+ sales teams using LeadLinx to convert Reddit conversations into pipeline. Start with 50 free credits.
          </p>
          <Link href="/login" className="btn-primary inline-block px-8 py-4 text-lg">
            Create Free Account
          </Link>
        </section>

        {/* Internal Links */}
        <section className="space-y-4">
          <h3 className="font-headline text-lg text-on-surface">Related Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/blog" className="bento-card p-4 rounded-xl flex items-center gap-3 hover:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-primary">article</span>
              <span className="text-sm text-on-surface">Read Our Blog</span>
            </Link>
            <Link href="/pricing" className="bento-card p-4 rounded-xl flex items-center gap-3 hover:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-secondary">payments</span>
              <span className="text-sm text-on-surface">View Pricing Plans</span>
            </Link>
          </div>
        </section>

        {/* Explore Other Categories */}
        <section className="space-y-4">
          <h3 className="font-headline text-lg text-on-surface">Explore Other Lead Categories</h3>
          <div className="flex flex-wrap gap-3">
            {Object.keys(keywordData).filter(k => k !== p.keyword).map((k) => (
              <Link key={k} href={`/find-leads/${k}`} className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium border border-outline/10 text-on-surface">
                {keywordData[k].title} Leads
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
