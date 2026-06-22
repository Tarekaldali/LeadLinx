'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleInput = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        code: verificationCode,
        redirect: false,
      });

      if (result.error) {
        throw new Error(result.error || 'Invalid code');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendStatus === 'sending' || cooldown > 0) return;
    setResendStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(60);
          setResendStatus('idle');
          setError(data.error || 'Please wait 60 seconds before requesting another code.');
        } else {
          throw new Error(data.error || 'Failed to resend code');
        }
      } else {
        setResendStatus('sent');
        setCooldown(60);
        setCode(['', '', '', '', '', '']);
        setTimeout(() => document.getElementById('code-0')?.focus(), 100);
        setTimeout(() => setResendStatus('idle'), 3000);
      }
    } catch (err) {
      setError(err.message);
      setResendStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#111827' }}>
      <div className="w-full max-w-[440px] space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: '#ef4444' }}>verified_user</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Check your email</h1>
          <p style={{ color: '#94a3b8' }}>
            We&apos;ve sent a 6-digit code to{' '}
            <span className="text-white font-bold">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[2.5rem] p-8 shadow-2xl space-y-6" style={{ backgroundColor: '#182235', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Error */}
          {error && (
            <div className="p-4 rounded-2xl flex items-center gap-3 text-sm animate-shake" style={{ backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171' }}>
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          {/* Resent success */}
          {resendStatus === 'sent' && (
            <div className="p-4 rounded-2xl flex items-center gap-3 text-sm" style={{ backgroundColor: 'rgba(40,205,65,0.1)', border: '1px solid rgba(40,205,65,0.2)', color: '#28cd41' }}>
              <span className="material-symbols-outlined text-xl">check_circle</span>
              New code sent! Check your inbox.
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-8">
            {/* Code inputs */}
            <div className="flex justify-between gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-16 rounded-xl text-center text-2xl font-bold text-white outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.6)'; e.target.style.backgroundColor = 'rgba(239,68,68,0.05)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                  maxLength={1}
                  required
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-white rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
              style={{ backgroundColor: '#ef4444' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Verify & Login'
              )}
            </button>
          </form>

          {/* Resend section */}
          <div className="text-center space-y-3">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Didn&apos;t receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resendStatus === 'sending' || cooldown > 0}
              className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: (resendStatus === 'sending' || cooldown > 0)
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(239,68,68,0.12)',
                color: (resendStatus === 'sending' || cooldown > 0)
                  ? 'rgba(255,255,255,0.35)'
                  : '#ef4444',
                border: `1px solid ${(resendStatus === 'sending' || cooldown > 0)
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(239,68,68,0.25)'}`,
                cursor: (resendStatus === 'sending' || cooldown > 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {resendStatus === 'sending' ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(239,68,68,0.3)', borderTopColor: '#ef4444' }} />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">timer</span>
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Resend Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 hover:text-white transition-colors text-sm"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#111827' }}>
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(239,68,68,0.3)', borderTopColor: '#ef4444' }}></div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
