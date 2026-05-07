'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignup = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Failed to connect to Google. Please try again.');
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-on-surface flex flex-col justify-center items-center p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] -z-10"></div>

      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </Link>
        <div className="bento-card p-8 space-y-8 bg-white/80 backdrop-blur-md shadow-2xl border border-border-glass">
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold text-on-surface">Create Account</h1>
            <p className="text-on-surface-variant font-body mt-2">Start finding high-intent leads today.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignup}
              className="w-full h-12 bg-white hover:bg-surface-dim text-on-surface rounded-xl font-bold border border-border-glass flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign up with Google
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border-glass"></div>
              <span className="flex-shrink mx-4 text-[10px] font-data-label text-on-surface-variant uppercase tracking-widest">Or use email</span>
              <div className="flex-grow border-t border-border-glass"></div>
            </div>

            <form onSubmit={handleSendCode} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs text-center animate-shake">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-data-label text-on-surface-variant uppercase tracking-widest ml-1">Full Name (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-data-label text-on-surface-variant uppercase tracking-widest ml-1">Work Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account & Get Credits
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center pt-4 border-t border-border-glass">
            <p className="text-sm text-on-surface-variant">
              Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Log In</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
