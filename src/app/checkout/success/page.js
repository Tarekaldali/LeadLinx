'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const tapId = searchParams.get('tap_id');

  return (
    <div className="min-h-screen bg-surface-container-low dark:bg-background flex items-center justify-center p-6 font-sans">
      <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-border-glass">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
        </div>
        
        <h1 className="text-3xl font-bold text-on-surface dark:text-on-surface mb-3 tracking-tight">Payment Successful!</h1>
        <p className="text-on-surface-variant dark:text-on-surface-variant text-lg mb-8">
          Thank you for your purchase. Your account has been upgraded and your new credits have been added.
        </p>

        {tapId && (
          <div className="mb-8 p-4 bg-surface-container-low dark:bg-surface-container rounded-xl text-sm border border-border-glass">
            <span className="text-on-surface-variant dark:text-on-surface-variant block mb-1">Transaction Reference</span>
            <code className="font-mono text-on-surface dark:text-on-surface font-semibold">{tapId}</code>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link 
            href="/dashboard" 
            className="w-full flex items-center justify-center py-4 bg-primary hover:bg-red-700 text-white rounded-xl font-semibold text-lg transition-all shadow-md shadow-primary/20"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-container-low dark:bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
