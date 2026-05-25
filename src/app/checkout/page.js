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

  const planName = searchParams.get('plan') || 'starter';
  const plansData = {
    plus: { name: 'Plus', price: '$3.99', amount: 3.99, credits: 1000, interval: 'month' },
    pro: { name: 'Pro', price: '$7.99', amount: 7.99, credits: 2000, interval: 'month' },
    enterprise: { name: 'Enterprise', price: '$19.99', amount: 19.99, credits: 5000, interval: 'month' },
  };

  const planKey = planName.toLowerCase();
  const plan = plansData[planKey] || plansData.plus;
  const isAlreadyOnPaidPlan = user?.plan && user.plan !== 'free';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAlreadyOnPaidPlan) {
    return (
      <div className="min-h-screen bg-surface-container-low dark:bg-background flex items-center justify-center p-6">
        <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-border-glass">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface dark:text-on-surface mb-2">You&apos;re already subscribed!</h2>
          <p className="text-on-surface-variant dark:text-on-surface-variant mb-8">You are currently on the <span className="capitalize font-semibold">{user.plan}</span> plan. Manage your billing in settings.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/portal', { method: 'POST' });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Manage Subscription
            </button>
            <Link href="/dashboard" className="w-full py-3 bg-surface border border-border-glass text-on-surface-variant rounded-xl font-medium hover:hover:bg-surface-container transition-colors text-center">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
        setLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low dark:bg-background flex flex-col font-sans">
      <header className="px-6 py-6 lg:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-new.png" alt="LeadLinx Logo" className="w-32 h-32 object-contain" />
          <span className="font-bold text-on-surface dark:text-on-surface text-xl tracking-tight">LeadLinx</span>
        </Link>
        <Link href="/pricing" className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">close</span>
          Cancel
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

        {/* Left Column - CTA */}
        <div className="w-full lg:w-1/2">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-on-surface dark:text-on-surface mb-3 tracking-tight">Complete your upgrade</h1>
            <p className="text-on-surface-variant dark:text-on-surface-variant text-lg">You&apos;ll be securely redirected to Stripe to complete your payment.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm border border-border-glass p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Email for receipt</label>
                  <input
                    type="email"
                    readOnly
                    value={user?.email || ''}
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-surface-container border border-border-glass rounded-xl text-on-surface dark:text-on-surface outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-1">Receipts will be sent to your account email.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-primary hover:bg-red-700 text-white rounded-xl font-semibold text-lg transition-all shadow-md shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed group"
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

            <div className="flex items-center justify-center gap-2 text-on-surface-variant dark:text-on-surface-variant text-sm mt-4">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Secure SSL encrypted payment
            </div>
          </form>

          {/* Testimonial / Trust */}
          <div className="mt-16 pt-8 border-t border-border-glass">
            <p className="text-on-surface-variant dark:text-on-surface-variant italic text-sm mb-4">&quot;LeadLinx doubled our outbound pipeline within the first two weeks. The intent-scoring engine is incredible.&quot;</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container dark:bg-surface-container rounded-full flex items-center justify-center font-bold text-on-surface-variant dark:text-on-surface-variant">M</div>
              <div>
                <div className="text-sm font-bold text-on-surface dark:text-on-surface">Michael Chen</div>
                <div className="text-xs text-on-surface-variant dark:text-on-surface-variant">VP of Sales, TechFlow</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary Card */}
        <div className="w-full lg:w-5/12 sticky top-8">
          <div className="bg-surface rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-border-glass overflow-hidden">
            <div className="p-8">
              <div className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Order Summary</div>
              <h2 className="text-3xl font-bold text-on-surface dark:text-on-surface mb-6 flex items-end gap-2">
                {plan.price}
                <span className="text-base font-medium text-on-surface-variant dark:text-on-surface-variant pb-1">/{plan.interval}</span>
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between pb-4 border-b border-border-glass">
                  <div className="text-on-surface-variant dark:text-on-surface-variant font-medium">LeadLinx {plan.name}</div>
                  <div className="text-on-surface dark:text-on-surface font-semibold">{plan.price}</div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-border-glass">
                  <div className="text-on-surface-variant dark:text-on-surface-variant font-medium">AI Search Credits</div>
                  <div className="text-on-surface dark:text-on-surface font-semibold">{plan.credits.toLocaleString()}/mo</div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-border-glass">
                  <div className="text-on-surface-variant dark:text-on-surface-variant font-medium">Omni-Extractor Engine</div>
                  <div className="text-green-600 font-semibold text-sm bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Included</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant dark:text-on-surface-variant">Subtotal</span>
                  <span className="font-medium text-on-surface dark:text-on-surface">{plan.price}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant dark:text-on-surface-variant">Taxes</span>
                  <span className="font-medium text-on-surface-variant dark:text-on-surface-variant">Calculated at checkout</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low dark:bg-surface-container p-6 border-t border-border-glass space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface dark:text-on-surface">Total due today</span>
                <span className="text-xl font-bold text-on-surface dark:text-on-surface">{plan.price}</span>
              </div>

              <div className="text-xs text-on-surface-variant dark:text-on-surface-variant leading-relaxed text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy. Your subscription will automatically renew until you cancel. Cancel anytime in your account settings.
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-on-surface-variant dark:text-on-surface-variant">Powered by</span>
              <svg viewBox="0 0 60 25" width="50" height="20" fill="currentColor" className="text-on-surface-variant dark:text-on-surface-variant">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32c-1.15.58-2.82.96-4.73.96-3.8 0-6.62-2.14-6.62-6.47 0-4.16 2.72-6.52 6.18-6.52 3.84 0 5.98 2.65 5.98 6.08 0 .42-.03.74-.03 1.03zm-4.07-2.61c-.04-1.39-.89-2.22-2.02-2.22-1.36 0-2.34 1.03-2.55 2.22h4.57z" />
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
      <div className="min-h-screen bg-surface-container-low dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-on-surface-variant dark:text-on-surface-variant font-medium">Preparing secure checkout...</span>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
