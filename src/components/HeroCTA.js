'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function HeroCTA() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;

  if (status === 'loading') {
    return (
      <div className="bg-primary/50 text-transparent font-button text-button px-6 py-3 rounded flex items-center justify-center gap-2 animate-pulse w-[240px]">
        Loading...
      </div>
    );
  }

  return (
    <Link 
      href={isLoggedIn ? "/dashboard" : "/login"} 
      className="bg-primary text-on-primary font-button text-button px-6 py-3 rounded btn-gradient flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-effect"
    >
      Generate Free Leads
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </Link>
  );
}
