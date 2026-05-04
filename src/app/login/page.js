'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dim flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </Link>
        <div className="bento-card p-8 space-y-8">
          <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-purple mb-4">
            <span className="material-symbols-outlined text-white text-2xl">bolt</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Welcome back</h1>
          <p className="text-on-surface-variant font-body mt-2">Log in to your LeadLinx dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-error-container border border-error/20 text-error text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-data-label text-on-surface-variant uppercase">Work Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-data-label text-on-surface-variant uppercase">Password</label>
              <Link href="#" className="text-xs text-primary hover:underline">Forgot?</Link>
            </div>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-center">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-border-glass">
          <p className="text-sm text-on-surface-variant">
            New to LeadLinx? <Link href="/signup" className="text-primary font-medium hover:underline">Create Account</Link>
          </p>
        </div>
        </div>
      </div>
      
      <div className="mt-8 flex items-center gap-2 text-xs font-data-label text-lime-green/70">
        <span className="w-2 h-2 rounded-full bg-lime-green animate-pulse"></span>
        SYSTEM LIVE
      </div>
    </div>
  );
}
