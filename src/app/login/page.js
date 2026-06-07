'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = false;


import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();
  const [requestedCallbackUrl, setRequestedCallbackUrl] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedCallbackUrl(params.get('callbackUrl'));
  }, []);
  const callbackUrl = requestedCallbackUrl?.startsWith('/') ? requestedCallbackUrl : '/dashboard';

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      setCodeSent(true);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.10),transparent_28%)] pointer-events-none" />
      <div className="w-full max-w-[440px] space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-2 relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <img src="/logo-new.png" alt="LeadLinx Logo" className="w-68 h-48 object-contain group-hover:scale-105 transition-transform drop-shadow-xl" />
          </Link>
          <h1 className="text-3xl font-bold text-on-surface mt-6 tracking-tight">Welcome back</h1>
          <p className="text-on-surface-variant">Choose your preferred login method</p>
        </div>

        <div className="bg-surface/90 backdrop-blur-xl border border-border-glass rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative z-10">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error text-sm animate-shake">
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <span className="relative px-4 bg-surface text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">or use email</span>
          </div>

          {/* Email Login */}
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant ml-4">Email Address</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-2xl pl-12 pr-5 text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:bg-primary/5 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Send Verification Code
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant text-sm relative z-10">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  </Suspense>
  );
}
