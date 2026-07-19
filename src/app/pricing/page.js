import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import Image from 'next/image';
import PricingClient from '@/components/pricing/PricingClient';

export const metadata = {
  title: 'Pricing Plans & Credits | LeadLinx',
  description: 'Choose the perfect LeadLinx plan to automate your Reddit lead generation. Flexible credit pricing for startups, agencies, and enterprise sales teams.',
};
export const revalidate = 3600;

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'LeadLinx Credits',
            description: 'AI-powered lead generation credits for Reddit prospecting.',
            brand: {
              '@type': 'Brand',
              name: 'LeadLinx'
            },
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '0',
              highPrice: '49',
              priceCurrency: 'USD',
              offerCount: '3',
              offers: [
                {
                  '@type': 'Offer',
                  name: 'Starter Plan',
                  price: '3.99',
                  priceCurrency: 'USD'
                },
                {
                  '@type': 'Offer',
                  name: 'Growth Plan',
                  price: '7.99',
                  priceCurrency: 'USD'
                },
                {
                  '@type': 'Offer',
                  name: 'Pro Plan',
                  price: '19.99',
                  priceCurrency: 'USD'
                }
              ]
            }
          })
        }}
      />
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
        <PricingClient plans={plans.map(p => ({ ...p, _id: p._id.toString() }))} />
        
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
              <Image src="https://www.vectorlogo.zone/logos/stripe/stripe-ar21.svg" alt="Stripe Logo" width={136} height={56} className="object-contain" />
            </div>

            <div className="space-y-4 pt-4 border-t border-border-glass">
              <h2 className="text-2xl font-headline text-on-surface">Need a custom solution?</h2>
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

