import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Pricing — Affordable AI Lead Generation',
  description: 'Choose the LeadLinx plan that fits your growth stage. Start free, upgrade anytime. Plans from $0 to $7.99/month.',
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with AI-powered lead discovery.',
    features: [
      '400 Credits / month',
      'Basic AI Lead Scoring',
      'Reply Generation (5/day)',
      'CSV Export',
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
  },
  {
    name: 'Plus',
    price: '$3.99',
    period: '/month',
    description: 'Ideal for solo founders and small sales teams.',
    features: [
      '2000 Credits / month',
      'Advanced AI Lead Scoring',
      'Unlimited Reply Generation',
      'Priority Support',
      'Negative Keyword Filters',
    ],
    cta: 'Upgrade to Plus',
    ctaHref: '/checkout?plan=plus',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$7.99',
    period: '/month',
    description: 'Perfect for scaling agencies and sales squads.',
    features: [
      '2000 Credits / month',
      'Advanced Intent Analysis',
      'Unlimited Reply Generation',
      'Priority Support (Slack)',
      'Email Alerts for Hot Leads',
      'Team Collaboration (3 seats)',
    ],
    cta: 'Upgrade to Pro',
    ctaHref: '/checkout?plan=pro',
    highlight: true,
    badge: 'MOST POPULAR',
  },
      {
    name: 'Enterprise',
    price: '$19.99',
    period: '/month',
    description: 'Perfect for scaling agencies and sales squads.',
    features: [
      '5000 Credits / month',
      'Advanced Intent Analysis',
      'Unlimited Reply Generation',
      'Priority Support (Slack)',
      'Email Alerts for Hot Leads',
      'Team Collaboration (10 seats)',
    ],
    cta: 'Upgrade to Enterprise',
    ctaHref: '/checkout?plan=enterprise',
    highlight: true,
    badge: 'MOST POPULAR',
  },
];

export default function PricingPage() {
  return (
    <div className="bg-white text-on-surface min-h-screen">
      <Navbar activePage="pricing" />

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        {/* Header */}
        <section className="text-center space-y-4 relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
          <h1 className="font-display text-4xl md:text-5xl relative z-10 text-on-surface">Affordable AI Lead Generation</h1>
          <p className="text-on-surface-variant text-xl max-w-2xl mx-auto relative z-10">
            AI-powered lead scoring and automated outreach. Choose the plan that fits your budget.
          </p>
        </section>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`bento-card p-8 rounded-2xl flex flex-col justify-between relative ${plan.highlight ? 'border-primary/30 shadow-lg shadow-primary/5' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white rounded-full text-[10px] font-data-label font-bold tracking-widest">
                  {plan.badge}
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-headline text-2xl mb-1 text-on-surface">{plan.name}</h3>
                  <p className="text-sm text-on-surface-variant">{plan.description}</p>
                </div>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-on-surface">{plan.price}</span>
                  <span className="font-data-label text-on-surface-variant">{plan.period}</span>
                </div>
                
                <ul className="space-y-3">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-lime-green text-sm">check_circle</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Link
                href={plan.ctaHref}
                className={`mt-8 text-center py-3 rounded-xl font-bold transition-all hover:brightness-110 active:scale-95 block ${
                  plan.highlight
                    ? 'btn-primary'
                    : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <section className="space-y-6">
          <h2 className="font-headline text-2xl text-center text-on-surface">Compare All Features</h2>
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free</th>
                    <th>Starter</th>
                    <th>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Monthly Credits</td><td className="font-data-value">50</td><td className="font-data-value">300</td><td className="font-data-value">600</td></tr>
                  <tr><td>AI Scoring Logic</td><td>Basic</td><td>Advanced</td><td>Advanced + Custom</td></tr>
                  <tr><td>Reply Generation</td><td>5 / day</td><td>Unlimited</td><td>Unlimited</td></tr>
                  <tr><td>Data Export</td><td>CSV Only</td><td>CSV + CRM</td><td>CSV + CRM + API</td></tr>
                  <tr><td>Email Alerts</td><td>—</td><td>—</td><td className="text-lime-green font-data-value">✓</td></tr>
                  <tr><td>Priority Support</td><td>—</td><td className="text-lime-green font-data-value">✓</td><td className="text-lime-green font-data-value">✓ (Slack)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
