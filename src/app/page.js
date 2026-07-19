import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import AnimatedSearchBar from '@/components/AnimatedSearchBar';

export const metadata = {
  title: 'AI Reddit Lead Generation Tool for B2B | LeadLinx',
  description: 'Use free Reddit tools to check buyer intent, generate search ideas, score posts, draft safer replies, and plan when to move into Leadline V3.',
};

export const revalidate = 3600;

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  // Fetch live global platform stats — seeds from saved_leads on first access
  let totalLeads = 0;
  try {
    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();
    let statsDoc = await db.collection('platform_stats').findOne({ _id: 'global' });
    if (!statsDoc || !statsDoc.totalLeadsExtracted) {
      // Seed once from actual data
      const realCount = await db.collection('saved_leads').countDocuments();
      await db.collection('platform_stats').updateOne(
        { _id: 'global' },
        { $set: { totalLeadsExtracted: realCount } },
        { upsert: true }
      );
      totalLeads = realCount;
    } else {
      totalLeads = statsDoc.totalLeadsExtracted;
    }
  } catch (e) {
    console.error('Failed to fetch platform stats:', e);
  }

  return (
    <div className="bg-background text-on-surface">
      <Navbar activePage="platform" />

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10"></div>
          
          <div className="w-full md:w-[55%] flex flex-col items-start text-left z-10">
            {/* Headline */}
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-on-surface">
              Turn Reddit <br/>
              Conversations into <br/>
              <span className="text-[#FF4500]">Qualified Leads</span>
            </h1>
            
            {/* Subtitle */}
            <h2 className="font-body text-on-surface-variant text-lg md:text-xl max-w-lg mb-8 leading-relaxed font-normal">
              Stop scrolling. Our AI monitors thousands of subreddits in real-time, identifies users with buying intent, and delivers high-converting prospects straight to your CRM.
            </h2>

            {/* Buttons */}
            <div className="flex flex-col gap-3 mb-16">
              <div className="flex flex-wrap items-center gap-4">
                {isLoggedIn ? (
                  <Link href="/dashboard" className="btn-solid flex items-center gap-2 px-8 py-4 font-semibold text-[15px] rounded-xl bg-on-surface text-surface hover:bg-on-surface/90 shadow-md">
                    Generate Free Leads
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="btn-solid flex items-center gap-2 px-8 py-4 font-semibold text-[15px] rounded-xl bg-[#FF4500] text-white hover:bg-[#FF4500]/90 shadow-md transition-all">
                      Start Your Free Trial
                      <span className="material-symbols-outlined text-lg">bolt</span>
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors px-4">
                      Sign in to existing
                    </Link>
                  </>
                )}
              </div>
              {!isLoggedIn && (
                <p className="text-xs text-on-surface-variant/70 font-medium px-2">No credit card required. Setup in 60 seconds.</p>
              )}
            </div>


            {/* Stats Row — 3 columns: Leads Extracted, Qualification Rate, 24/7 */}
            <div className="grid grid-cols-3 gap-8 w-full border-t border-border-glass pt-8">
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                  {totalLeads > 0 ? `${totalLeads.toLocaleString()}+` : '—'}
                </div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Leads Analyzed</div>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">31%</div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Qualification Rate</div>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">24/7</div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Monitoring</div>
              </div>
            </div>
          </div>

          {/* Right Side UI Elements / Cards */}
          <div className="w-full md:w-1/2 relative h-[400px] md:h-[600px] hidden md:block perspective-1000">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[80%] h-[80%]">
              {/* Back Card */}
              <div className="absolute top-0 right-12 w-full max-w-sm bento-card p-6 rounded-2xl shadow-xl transform rotate-12 opacity-40 blur-[2px] transition-transform duration-700 hover:rotate-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">credit_score</span>
                  </div>
                  <div className="font-headline text-on-surface-variant">Tap Payments Secured</div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-surface-container rounded-full"></div>
                  <div className="h-2 w-3/4 bg-surface-container rounded-full"></div>
                </div>
              </div>

              {/* Middle Card */}
              <div className="absolute top-12 right-6 w-full max-w-sm bento-card p-6 rounded-2xl shadow-xl transform rotate-6 opacity-70 transition-transform duration-700 hover:rotate-3 z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">psychology</span>
                  </div>
                  <div className="font-headline text-on-surface-variant">AI Analysis & Scoring</div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-surface-container rounded-full"></div>
                  <div className="h-2 w-5/6 bg-surface-container rounded-full"></div>
                  <div className="h-2 w-1/2 bg-surface-container rounded-full"></div>
                </div>
              </div>

              {/* Front Card */}
              <div className="absolute top-24 right-0 w-full max-w-sm bento-card p-6 rounded-2xl shadow-2xl transform transition-transform duration-700 hover:-translate-y-2 z-20 border border-border-glass bg-surface/90 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-primary">radar</span>
                  </div>
                  <div className="font-headline text-primary font-bold">Omni-Channel Discovery</div>
                </div>
                <p className="text-sm font-body text-on-surface-variant mb-6">Automated lead discovery across Reddit.</p>
                <div className="flex justify-between items-center text-xs font-data-label">
                  <span className="text-lime-green flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-lime-green animate-pulse"></span>
                    Global Reach
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
