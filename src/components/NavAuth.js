'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LogoutButton from './LogoutButton';

export default function NavAuth() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-4 animate-pulse opacity-50">
        <div className="h-5 w-12 bg-surface-variant rounded"></div>
        <div className="h-9 w-28 bg-primary/20 rounded"></div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <>
        <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors">
          Generate Free Leads
        </Link>
        <LogoutButton />
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors">
        Log in
      </Link>
      <Link href="/login" className="btn-primary text-sm py-2 px-6">
        Sign Up
      </Link>
    </>
  );
}
