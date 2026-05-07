'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import './checkout.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const planName = searchParams.get('plan') || 'Starter';
  
  const [formData, setFormData] = useState({
    email: session?.user?.email || '',
    name: session?.user?.name || '',
    address: '',
    city: '',
    zip: '',
    country: 'United States'
  });

  const [loading, setLoading] = useState(false);

  const plansData = {
    starter: { price: '$0', credits: 400 },
    plus: { price: '$3.99', credits: 1000 },
    pro: { price: '$7.99', credits: 2000 },
    enterprise: { price: '$19.99', credits: 5000 }
  };

  const plan = plansData[planName.toLowerCase()] || plansData.starter;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      alert('Stripe Checkout session would be created now.');
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <Link href="/" className="checkout-brand">
          <div className="checkout-brand-icon" />
          LeadLinx
        </Link>
        <Link href="/pricing" className="text-sm font-semibold text-gray-500 hover:text-black">
          Cancel
        </Link>
      </header>

      <main className="checkout-content">
        {/* Billing Column */}
        <form onSubmit={handleSubmit} className="billing-form">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Upgrade to {planName}</h1>
            <p className="text-gray-500 font-medium">Complete your details to access premium features.</p>
          </div>

          <div className="space-y-10">
            <section>
              <h3 className="form-section-title">Personal Information</h3>
              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input 
                    type="text" className="custom-input" required 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input 
                    type="email" className="custom-input" required
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="form-section-title">Billing Address</h3>
              <div className="input-group">
                <label className="input-label">Street Address</label>
                <input 
                  type="text" className="custom-input" required
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="input-group">
                  <label className="input-label">City</label>
                  <input 
                    type="text" className="custom-input" required
                    value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Postal Code</label>
                  <input 
                    type="text" className="custom-input" required
                    value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Country</label>
                  <select 
                    className="custom-input"
                    value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}
                  >
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </form>

        {/* Summary Column */}
        <aside className="p-4 lg:p-0">
          <div className="order-panel">
            <h2 className="order-title">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="item-row">
                <span className="item-label">LeadLinx {planName}</span>
                <span className="item-value">{plan.price}</span>
              </div>
              <div className="item-row">
                <span className="item-label">Credits ({plan.credits}/mo)</span>
                <span className="item-value">Included</span>
              </div>
              <div className="item-row">
                <span className="item-label">AI Analysis Engine</span>
                <span className="item-value">Active</span>
              </div>
            </div>

            <div className="divider" />

            <div className="total-row">
              <span className="total-label">Total due</span>
              <span className="total-price">{plan.price}</span>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="pay-button"
            >
              {loading ? "Processing..." : `Upgrade to ${planName}`}
            </button>

            <div className="secure-badge">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Secure, encrypted payment via Stripe
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-on-surface-variant font-medium">Preparing checkout...</span>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

