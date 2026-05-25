'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Check your email</h1>
          <p className="text-on-surface-variant">We've sent a 6-digit code to <span className="text-white font-bold">{email}</span></p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error text-sm animate-shake">
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-8">
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
                  className="w-12 h-16 bg-surface/5 border border-outline-variant rounded-xl text-center text-2xl font-bold text-white focus:border-primary/50 focus:bg-primary/5 outline-none transition-all"
                  maxLength={1}
                  required
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Verify & Login'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-white/40 text-sm">
              Didn't receive the code?{' '}
              <button 
                onClick={() => router.push('/login')}
                className="text-primary hover:underline font-bold"
              >
                Try again
              </button>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <VerifyContent />
    </Suspense>
  );
}
