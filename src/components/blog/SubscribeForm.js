"use client";
import { useState } from 'react';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe');

      setStatus('success');
      setMessage(data.message || 'Successfully subscribed!');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-[#EEEEEE] p-5 shadow-sm">
      <h4 className="text-[14px] font-bold text-on-surface mb-1">Subscribe</h4>
      <p className="text-secondary text-[13px] mb-4 leading-relaxed">Get the latest insights on sales automation delivered to your inbox.</p>
      
      {status === 'success' ? (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {message}
        </div>
      ) : (
        <form className="space-y-2" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Work Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className="w-full px-3 py-2.5 rounded-lg border border-[#EEEEEE] text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-50"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-surface-container-high text-on-surface text-sm font-semibold py-2.5 rounded-lg border border-[#EEEEEE] hover:bg-surface-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <div className="w-4 h-4 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
            ) : 'Subscribe'}
          </button>
          {status === 'error' && (
            <p className="text-red-500 text-xs mt-1">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
