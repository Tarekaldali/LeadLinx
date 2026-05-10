'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { useSession } from 'next-auth/react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  
  const planName = searchParams.get('plan') || 'Starter';
  const plansData = {
    free: { name: 'Free', price: '$0', credits: 100, interval: 'month' },
    starter: { name: 'Starter', price: '$29', credits: 400, interval: 'month' },
    plus: { name: 'Plus', price: '$79', credits: 1000, interval: 'month' },
    pro: { name: 'Pro', price: '$149', credits: 2000, interval: 'month' },
    enterprise: { name: 'Enterprise', price: '$299', credits: 5000, interval: 'month' }
  };
  
  const planKey = planName.toLowerCase();
  const plan = plansData[planKey] || plansData.starter;
  const isFree = planKey === 'free';
  const isAlreadyOnPaidPlan = user?.plan && user.plan !== 'free';

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleCheckout = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate redirect to Stripe
    setTimeout(() => {
      setLoading(false);
      alert('Redirecting to Stripe Secure Checkout...');
    }, 1500);
  };

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  if (isAlreadyOnPaidPlan && !isFree) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're already subscribed!</h2>
          <p className="text-gray-500 mb-8">You are currently on the {user.plan} plan. Manage your billing details and invoices in your settings.</p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/settings" className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
              Manage Billing
            </Link>
            <Link href="/dashboard" className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col font-sans">
      <header className="px-6 py-6 lg:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[18px]">bolt</span>
          </div>
          <span className="font-bold text-gray-900 text-xl tracking-tight">LeadLinx</span>
        </Link>
        <Link href="/pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">close</span>
          Cancel
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
        
        {/* Left Column - User Info */}
        <div className="w-full lg:w-1/2">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Complete your upgrade</h1>
            <p className="text-gray-500 text-lg">You'll be securely redirected to Stripe to complete your payment.</p>
          </div>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 overflow-hidden">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email for receipt</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing Checkout...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Continue to Secure Checkout
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                </span>
              )}
            </button>
            
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-4">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Secure SSL encrypted payment
            </div>
          </form>

          {/* Testimonial / Trust */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-gray-500 italic text-sm mb-4">"LeadLinx doubled our outbound pipeline within the first two weeks. The intent-scoring engine is incredible."</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">M</div>
              <div>
                <div className="text-sm font-bold text-gray-900">Michael Chen</div>
                <div className="text-xs text-gray-500">VP of Sales, TechFlow</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary Card */}
        <div className="w-full lg:w-5/12 sticky top-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-8">
              <div className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Order Summary</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-end gap-2">
                {plan.price}
                <span className="text-base font-medium text-gray-500 pb-1">/{plan.interval}</span>
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="text-gray-600 font-medium">LeadLinx {plan.name}</div>
                  <div className="text-gray-900 font-semibold">{plan.price}</div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="text-gray-600 font-medium">AI Search Credits</div>
                  <div className="text-gray-900 font-semibold">{plan.credits.toLocaleString()}/mo</div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="text-gray-600 font-medium">Omni-Extractor Engine</div>
                  <div className="text-green-600 font-semibold text-sm bg-green-50 px-2 py-0.5 rounded-full">Included</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">{plan.price}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Taxes</span>
                  <span className="font-medium text-gray-500">Calculated at checkout</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total due today</span>
                <span className="text-xl font-bold text-gray-900">{plan.price}</span>
              </div>
              
              <div className="text-xs text-gray-500 leading-relaxed text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy. Your subscription will automatically renew until you cancel. Cancel anytime in your account settings.
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Powered by</span>
              <svg viewBox="0 0 60 25" width="50" height="20" fill="#6366f1">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32c-1.15.58-2.82.96-4.73.96-3.8 0-6.62-2.14-6.62-6.47 0-4.16 2.72-6.52 6.18-6.52 3.84 0 5.98 2.65 5.98 6.08 0 .42-.03.74-.03 1.03zm-4.07-2.61c-.04-1.39-.89-2.22-2.02-2.22-1.36 0-2.34 1.03-2.55 2.22h4.57zM44.42 20V7.32h3.9v12.68h-3.9zM42.27 10.3c0-1.28.99-2.22 2.22-2.22s2.24.94 2.24 2.22c0 1.25-.99 2.22-2.24 2.22-1.23 0-2.22-.97-2.22-2.22zm-7.66 1.48c-.68-.53-1.66-.82-2.73-.82-1.75 0-2.98.92-2.98 2.36 0 1.34 1.03 2 2.63 2.3l.97.2c1.03.19 1.62.53 1.62 1.25 0 .86-.88 1.48-2.32 1.48-1.5 0-2.98-.53-4.11-1.34v3.52c1.28.6 3 1 4.53 1 3.52 0 6.08-1.6 6.08-4.57 0-3.32-2.82-3.8-5.32-4.24-.8-.16-1.36-.33-1.36-.8 0-.5.6-1 1.77-1 1.15 0 2.22.41 3.2 1.03v-3.37zm-20.9 8.22V7.32h4.09v12.68h-4.09zm0-16.14V.36h4.09v3.5h-4.09zm-8.82 5.06l-.5-1.36h-4V7.32h3.29V3.53l4.09-1.23v5.02h3.66v3.86h-3.66v5.82c0 1.05.5 1.5 1.54 1.5.7 0 1.38-.16 2.1-.47v3.52c-1.11.45-2.61.64-4.09.64-3.15 0-4.44-1.54-4.44-4.63v-6.38zM26.23 7.32h3.9v2.24c.95-1.42 2.55-2.43 4.67-2.43 3.32 0 5.61 2.38 5.61 6.54 0 4.14-2.29 6.52-5.61 6.52-2.12 0-3.72-1.01-4.67-2.45v6.52h-3.9V7.32zm4.11 6.36c0 2 1.36 3.19 3 3.19 1.62 0 2.94-1.21 2.94-3.19 0-2-1.32-3.21-2.94-3.21-1.64 0-3 1.21-3 3.21z"/>
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">Preparing secure checkout...</span>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}


