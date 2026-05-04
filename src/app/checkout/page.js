'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('plan') || 'starter';
  const [selectedPlan, setSelectedPlan] = useState(preselected);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      interval: '/month',
      description: 'Get started with AI-powered lead discovery.',
      features: [
        '400 Credits/mo',
        'Basic AI Lead Scoring',
        'Reply Generation (5/day)',
        'CSV Export'
      ],
      buttonText: 'Current Plan',
      isPopular: false,
    },
    {
      id: 'Plus',
      name: 'Plus',
      price: '$3.99',
      interval: '/month',
      description: 'Perfect for solo founders and small teams.',
      features: [
        '1000 Credits/mo',
        'Advanced AI Lead Scoring',
        'Unlimited Reply Generation',
        'Negative Keyword Filters',
        'Priority Support'
      ],
      buttonText: 'Upgrade to Plus',
      isPopular: false,
    },
    {
      id: 'premium',
      name: 'Pro',
      price: '$7.99',
      interval: '/month',
      description: 'For growing sales teams who need more volume.',
      features: [
        '2000 Credits/mo',
        'Advanced Intent Analysis',
        'Unlimited Reply Generation',
        'Email Alerts for Hot Leads',
        'Team Collaboration (3 seats)',
        'Priority Support (Slack)'
      ],
      buttonText: 'Upgrade to Pro',
      isPopular: true,
    },
        {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$19.99',
      interval: '/month',
      description: 'Perfect for solo founders and small teams.',
      features: [
        '5000 Credits/mo',
        'Advanced AI Lead Scoring',
        'Unlimited Reply Generation',
        'Negative Keyword Filters',
        'Priority Support'
      ],
      buttonText: 'Upgrade to Plus',
      isPopular: false,
    },
  ];

  const handleCheckout = (planId) => {
    setSelectedPlan(planId);
    if (planId === 'free') return;
    // Stripe checkout would be integrated here
    alert(`Stripe checkout for ${planId} plan would open here.\n\nThis will be connected to Stripe once you provide your Stripe API keys.`);
  };

  return (
    <div className="min-h-screen bg-white text-on-surface pb-24">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-border-glass w-full sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-3 max-w-[1920px] mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-purple flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">bolt</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-on-surface">LeadLinx</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mt-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/50 border border-primary/10 text-xs font-data-label text-primary mb-6">
          <span className="material-symbols-outlined text-sm">workspace_premium</span>
          UPGRADE YOUR PLAN
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Choose your growth engine</h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
          Scale your lead generation with transparent pricing. No hidden fees. Cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative bento-card p-8 rounded-3xl flex flex-col transition-all ${
              plan.isPopular ? 'border-2 border-primary shadow-xl shadow-primary/10 scale-105 z-10' : 'border border-border-glass'
            } ${selectedPlan === plan.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-on-surface mb-2">{plan.name}</h3>
              <p className="text-sm text-on-surface-variant h-10">{plan.description}</p>
            </div>
            
            <div className="mb-8">
              <span className="text-4xl font-display font-bold text-on-surface">{plan.price}</span>
              <span className="text-on-surface-variant">{plan.interval}</span>
            </div>
            
            <button 
              className={`w-full py-3 rounded-xl font-bold text-sm mb-8 transition-all active:scale-95 cursor-pointer ${
                plan.isPopular || selectedPlan === plan.id
                  ? 'btn-primary' 
                  : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-border-glass'
              } ${plan.id === 'free' ? 'opacity-60 cursor-default' : ''}`}
              onClick={() => handleCheckout(plan.id)}
              disabled={plan.id === 'free'}
            >
              {plan.id === 'free' ? 'Free Plan' : plan.buttonText}
            </button>
            
            <div className="flex-1 space-y-4">
              <p className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">What&apos;s included</p>
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lime-green text-sm mt-0.5">check_circle</span>
                  <span className="text-sm text-on-surface-variant">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* FAQ / Trust */}
      <div className="max-w-3xl mx-auto px-6 mt-24 text-center">
        <h3 className="text-2xl font-headline mb-6">Need a custom plan?</h3>
        <p className="text-on-surface-variant mb-6">
          If you have specific requirements or want to discuss enterprise licensing, we&apos;re here to help.
        </p>
        <Link href="mailto:tarekaldali1@gmail.com" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
          Contact our team
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
