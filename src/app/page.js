import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSearch from '@/components/HeroSearch';

export default async function LandingPage() {
  return (
    <div className="bg-white text-on-surface">
      <Navbar activePage="platform" />

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] p-12 md:p-24 flex flex-col items-center text-center gradient-hero">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/50 border border-primary/10 text-xs font-data-label text-primary mb-8">
            <span className="w-2 h-2 rounded-full bg-lime-green animate-pulse"></span>
            AI-POWERED LEAD INTELLIGENCE
          </div>

          <h1 className="font-display text-4xl md:text-6xl max-w-4xl leading-tight mb-6 text-on-surface">
            Find Reddit Leads <span className="text-primary">with AI</span>
          </h1>
          <p className="font-body text-on-surface-variant max-w-2xl text-xl mb-10">
            Just describe what you&apos;re looking for. Our AI picks the best subreddits and surfaces high-intent prospects — no setup needed.
          </p>

          {/* Live search bar — redirects to dashboard */}
          <HeroSearch />

          <p className="text-sm text-on-surface-variant mt-6">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            &nbsp;·&nbsp;<Link href="/pricing" className="text-on-surface-variant hover:underline">View pricing</Link>
          </p>
        </section>

        {/* Demo Search Interface */}
        <section className="space-y-8">
          {/* Example Lead Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { sub: 'SaaS', intent: 98, label: 'Critical', text: '"We are scaling our sales team and our current outreach tool is hitting daily limits. Looking for a high-volume alternative..."', time: '14m ago', hot: true },
              { sub: 'entrepreneur', intent: 85, label: 'Warm Lead', text: '"Does anyone have recommendations for lead gen services that actually work for B2B? Tried cold email but zero responses..."', time: '2h ago', hot: false },
              { sub: 'marketing', intent: 92, label: 'High Signal', text: '"Budget of $2k/mo for a tool that can help identify prospects on niche forums. Any specialized software out there?"', time: '47m ago', hot: true },
            ].map((card, i) => (
              <div key={i} className="bento-card p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                        <span className="text-secondary font-bold text-xs">r/</span>
                      </div>
                      <span className="font-data-value text-on-surface">{card.sub}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`${card.hot ? 'intent-hot ai-glow' : 'intent-warm'} px-2.5 py-1 rounded-lg font-data-value text-sm`}>{card.intent}% Intent</span>
                      <span className="text-[10px] font-data-label text-on-surface-variant mt-1 uppercase">{card.label}</span>
                    </div>
                  </div>
                  <p className="font-body text-on-surface-variant mb-6 line-clamp-3 italic text-sm">
                    {card.text}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border-glass">
                  <span className="text-xs font-data-label text-on-surface-variant">Posted {card.time}</span>
                  {i === 0 && (
                    <Link href="/signup" className="text-primary hover:text-primary/80 flex items-center gap-1 font-data-value text-sm">
                      Find Leads Like This
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bento-card p-6 rounded-2xl md:col-span-2 relative overflow-hidden">
            <h3 className="font-headline text-2xl mb-2 text-on-surface">Network Expansion</h3>
            <p className="font-body text-on-surface-variant mb-6">Our AI learns from 10k+ new threads every hour to refine targeting.</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-primary">1.2M</span>
              <span className="font-data-label text-on-surface-variant">Posts Scanned Today</span>
            </div>
          </div>
          <div className="bento-card p-6 rounded-2xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-secondary text-3xl">auto_awesome</span>
            <div>
              <div className="font-data-value text-xl text-on-surface">Auto-Reply</div>
              <p className="text-xs text-on-surface-variant mt-1">Draft personalized responses using AI context.</p>
            </div>
          </div>
          <div className="bento-card p-6 rounded-2xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-primary text-3xl">hub</span>
            <div>
              <div className="font-data-value text-xl text-on-surface">Integrations</div>
              <p className="text-xs text-on-surface-variant mt-1">Export leads directly to your CRM via CSV.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary-container/30 rounded-[2.5rem] p-12 text-center space-y-6 border border-primary/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
          <h2 className="font-headline text-3xl relative z-10 text-on-surface">Ready to stop searching and start closing?</h2>
          <p className="font-body text-on-surface-variant max-w-xl mx-auto relative z-10">
            Join 500+ sales teams using LeadLinx to automate their Reddit prospecting.
          </p>
          <div className="relative z-10 pt-4">
            <Link href="/signup" className="btn-primary px-10 py-4 text-lg inline-block">
              Create Free Account
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
