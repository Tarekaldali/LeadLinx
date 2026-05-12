import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  let plans = [];
  try {
    const db = await getDb();
    plans = await db.collection('plans').find({}).toArray();
  } catch (error) {
    console.error('Failed to fetch plans:', error);
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar activePage="pricing" />
      
      <main className="flex-1 pb-24">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto px-6 mt-24 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight animate-fade-in">
            Choose your <span className="text-primary">growth</span> engine
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto font-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Scale your lead generation with transparent pricing. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="max-w-7xl mx-auto px-6 mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.length === 0 ? (
            <div className="col-span-full py-20 text-center text-on-surface-variant italic">
              Loading plans...
            </div>
          ) : (
            plans.map((plan, i) => (
              <div 
                key={plan._id.toString()} 
                className={`relative bento-card p-8 rounded-3xl flex flex-col transition-all duration-500 animate-scale-in ${
                  plan.highlight ? 'border-2 border-primary shadow-2xl shadow-primary/10 lg:scale-105 z-10' : 'border border-border-glass'
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {plan.highlight && plan.badge && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-on-surface mb-2">{plan.name}</h3>
                  <p className="text-sm text-on-surface-variant h-10 line-clamp-2 leading-relaxed">{plan.description}</p>
                </div>
                
                <div className="mb-8">
                  <span className="text-4xl font-display font-bold text-on-surface">{plan.price}</span>
                  <span className="text-on-surface-variant text-sm ml-1">{plan.period}</span>
                </div>
                
                <Link 
                  href={`/checkout?plan=${plan.name.toLowerCase()}`}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm mb-8 text-center transition-all active:scale-95 ${
                    plan.highlight 
                      ? 'btn-primary' 
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-border-glass'
                  }`}
                >
                  {plan.cta || (plan.name.toLowerCase() === 'free' ? 'Get Started' : `Buy ${plan.name}`)}
                </Link>
                
                <div className="flex-1 space-y-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4">Included Features</p>
                  {plan.features?.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-lime-green text-lg shrink-0">check_circle</span>
                      <span className="text-sm text-on-surface-variant font-medium leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Trust/FAQ Section */}
        <div className="max-w-4xl mx-auto px-6 mt-32">
          <div className="bento-card p-12 bg-surface-dim/50 border border-border-glass text-center space-y-8">
            <div className="flex justify-center gap-12">
               <div className="flex flex-col items-center gap-2">
                 <span className="material-symbols-outlined text-primary text-3xl">security</span>
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Secure</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Instant</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <span className="material-symbols-outlined text-primary text-3xl">support_agent</span>
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">24/7 Support</span>
               </div>
            </div>
            
            <div className="flex justify-center items-center gap-2 pt-6 opacity-60">
              <span className="text-sm font-medium text-on-surface-variant">Secured by</span>
              <svg viewBox="0 0 60 25" width="60" height="25" fill="currentColor" className="text-on-surface">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32c-1.15.58-2.82.96-4.73.96-3.8 0-6.62-2.14-6.62-6.47 0-4.16 2.72-6.52 6.18-6.52 3.84 0 5.98 2.65 5.98 6.08 0 .42-.03.74-.03 1.03zm-4.07-2.61c-.04-1.39-.89-2.22-2.02-2.22-1.36 0-2.34 1.03-2.55 2.22h4.57zM44.42 20V7.32h3.9v12.68h-3.9zM42.27 10.3c0-1.28.99-2.22 2.22-2.22s2.24.94 2.24 2.22c0 1.25-.99 2.22-2.24 2.22-1.23 0-2.22-.97-2.22-2.22zm-7.66 1.48c-.68-.53-1.66-.82-2.73-.82-1.75 0-2.98.92-2.98 2.36 0 1.34 1.03 2 2.63 2.3l.97.2c1.03.19 1.62.53 1.62 1.25 0 .86-.88 1.48-2.32 1.48-1.5 0-2.98-.53-4.11-1.34v3.52c1.28.6 3 1 4.53 1 3.52 0 6.08-1.6 6.08-4.57 0-3.32-2.82-3.8-5.32-4.24-.8-.16-1.36-.33-1.36-.8 0-.5.6-1 1.77-1 1.15 0 2.22.41 3.2 1.03v-3.37zm-20.9 8.22V7.32h4.09v12.68h-4.09zm0-16.14V.36h4.09v3.5h-4.09zm-8.82 5.06l-.5-1.36h-4V7.32h3.29V3.53l4.09-1.23v5.02h3.66v3.86h-3.66v5.82c0 1.05.5 1.5 1.54 1.5.7 0 1.38-.16 2.1-.47v3.52c-1.11.45-2.61.64-4.09.64-3.15 0-4.44-1.54-4.44-4.63v-6.38zM26.23 7.32h3.9v2.24c.95-1.42 2.55-2.43 4.67-2.43 3.32 0 5.61 2.38 5.61 6.54 0 4.14-2.29 6.52-5.61 6.52-2.12 0-3.72-1.01-4.67-2.45v6.52h-3.9V7.32zm4.11 6.36c0 2 1.36 3.19 3 3.19 1.62 0 2.94-1.21 2.94-3.19 0-2-1.32-3.21-2.94-3.21-1.64 0-3 1.21-3 3.21z"/>
              </svg>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-glass">
              <h3 className="text-2xl font-headline text-on-surface">Need a custom solution?</h3>
              <p className="text-on-surface-variant max-w-xl mx-auto">
                If you have specific requirements or want to discuss enterprise licensing for your entire team, we&apos;re here to help.
              </p>
              <Link href="mailto:tarekaldali1@gmail.com" className="btn-ghost inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-border-glass">
                Contact our team
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

