'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center rounded-2xl mx-auto mb-6">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Something went wrong</h2>
        <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
          We encountered an issue loading your dashboard. This usually happens if there's a temporary database connection timeout. 
          Please try refreshing the page.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-[#ff3b30] hover:bg-[#ff3b30]/90 text-white rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full py-3 px-4 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl font-semibold transition-colors border border-outline-variant"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
