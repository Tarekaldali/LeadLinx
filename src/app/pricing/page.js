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
            
            <div className="flex justify-center items-center gap-3 pt-6 opacity-80 group">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Secured by</span>
              <img src="https://www.vectorlogo.zone/logos/stripe/stripe-ar21.svg" alt="Stripe Logo" className="w-34 h-14" />
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

