'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
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

      setCodeSent(true);
      // Redirect to verify page with email in query param
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <img src="/logo-new.png" alt="LeadLinx Logo" className="w-68 h-48 object-contain group-hover:scale-110 transition-transform" />
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 tracking-tight">Welcome back</h1>
          <p className="text-on-surface-variant">Choose your preferred login method</p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error text-sm animate-shake">
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-background hover:bg-background/90 text-black rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-black/20"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative px-4 bg-[#121212] text-xs font-bold text-white/20 uppercase tracking-[0.2em]">or use email</span>
          </div>

          {/* Email Login */}
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/60 ml-4">Email Address</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-14 bg-background/5 border border-white/10 rounded-2xl pl-12 pr-5 text-white placeholder:text-white/20 focus:border-primary/50 focus:bg-primary/5 outline-none transition-all"
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

        <p className="text-center text-white/40 text-sm">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
