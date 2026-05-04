'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.push('/dashboard');
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
          <h1 className="text-2xl font-headline font-bold text-on-surface">Create Account</h1>
          <p className="text-on-surface-variant font-body mt-2">Start finding high-intent leads today.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-error-container border border-error/20 text-error text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-data-label text-on-surface-variant uppercase">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>

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
            <label className="text-xs font-data-label text-on-surface-variant uppercase">Password</label>
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
            {loading ? 'Creating Account...' : 'Get 50 Free Credits'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-border-glass">
          <p className="text-sm text-on-surface-variant">
            Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
