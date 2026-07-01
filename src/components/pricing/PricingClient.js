'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function PricingClient({ plans }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  // Filter plans based on the selected billing cycle
  // Yearly cycle matches '/year'
  // Monthly cycle matches anything except '/year' (like '/month', '/day', etc.)
  const displayedPlans = plans.filter(plan => {
    if (billingCycle === 'yearly') {
      return plan.period === '/year';
    } else {
      return plan.period !== '/year';
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 mt-20">
      {/* Toggle Switch */}
      <div className="flex justify-center mb-12">
        <div className="bg-surface-dim border border-border-glass p-1.5 rounded-full inline-flex items-center gap-1 shadow-inner relative">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
              billingCycle === 'monthly' ? 'text-inverse-on-surface' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              billingCycle === 'yearly' ? 'text-inverse-on-surface' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Yearly
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full transition-all duration-300 ${
              billingCycle === 'yearly' ? 'bg-primary/20 text-white' : 'bg-primary text-white'
            }`}>
              Save 20%
            </span>
          </button>
          
          {/* Animated Background Pill */}
          <div 
            className="absolute top-1.5 bottom-1.5 rounded-full bg-inverse-surface shadow-md transition-all duration-300 ease-spring"
            style={{
              left: billingCycle === 'monthly' ? '6px' : '48%',
              width: billingCycle === 'monthly' ? '96px' : '50%',
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {displayedPlans.length === 0 ? (
          <div className="col-span-full py-20 text-center text-on-surface-variant italic bg-surface-dim/30 rounded-3xl border border-border-glass">
            No {billingCycle} plans available at the moment.
          </div>
        ) : (
          displayedPlans.map((plan, i) => (
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
                href={`/checkout?plan=${plan.name.toLowerCase()}&period=${plan.period.replace('/', '')}`}
                className={`w-full py-3.5 rounded-xl font-bold text-sm mb-8 text-center transition-all active:scale-95 flex items-center justify-center ${
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
    </div>
  );
}
