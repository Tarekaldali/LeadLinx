import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  return (
    <div className="bg-white text-on-surface">
      <Navbar activePage="platform" />

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10"></div>
          
          <div className="w-full md:w-1/2 flex flex-col items-start text-left z-10">
            {/* Headline */}
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-on-surface">
              AI-Powered <br/>
              <span className="text-[#FF4500]">Reddit</span> Lead <br/>
              Generation
            </h1>
            
            {/* Subtitle */}
            <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
              Automatically discovers, analyzes, and qualifies potential prospects based on your ideal customer profile by monitoring relevant Reddit communities with advanced AI intelligence.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-16">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2 px-8 py-4 text-base rounded-2xl shadow-lg shadow-primary/20">
                  Go to Dashboard
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary flex items-center gap-2 px-8 py-4 text-base rounded-2xl shadow-lg shadow-primary/20">
                    Get Started Free
                    <span className="material-symbols-outlined text-xl">bolt</span>
                  </Link>
                  <Link href="/login" className="btn-ghost flex items-center gap-2 px-8 py-4 text-base rounded-2xl border border-border-glass bg-surface/50 hover:bg-surface">
                    Sign In
                  </Link>
                </>
              )}
            </div>


            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full border-t border-border-glass pt-8">
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">617+</div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Leads Analyzed</div>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">31%</div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Qualification Rate</div>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">8.1/10</div>
                <div className="text-xs text-on-surface-variant font-data-label mt-1">Avg Engagement</div>
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
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">forum</span>
                  </div>
                  <div className="font-headline text-on-surface-variant">Lead Management</div>
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
                  <div className="font-headline text-on-surface-variant">AI Analysis</div>
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
                  <div className="font-headline text-primary font-bold">Reddit Monitoring</div>
                </div>
                <p className="text-sm font-body text-on-surface-variant mb-6">Automated Reddit lead discovery for your niche.</p>
                <div className="flex justify-between items-center text-xs font-data-label">
                  <span className="text-lime-green flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-lime-green animate-pulse"></span>
                    24/7 Active
                  </span>
                  <span className="text-on-surface-variant">v3.0 Engine</span>
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
