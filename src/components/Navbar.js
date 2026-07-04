import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import LogoutButton from './LogoutButton';

export default async function Navbar({ activePage = 'platform' }) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  return (
    <nav className="bg-surface/80 backdrop-blur-xl border-b border-border-glass w-full top-0 sticky z-50 transition-colors">
      <div className="flex justify-between items-center w-full px-6 py-3 max-w-[1920px] mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            {/* <img src="/logo-new.png" alt="LeadLinx Logo" className="w-14 h-14 object-contain" /> */}
            <span className="font-extrabold text-2xl tracking-tight flex items-center">
              <span className="text-[#ff3b30]">Lead</span>
              <span className="text-on-surface">Linx</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              className={activePage === 'platform' ? 'text-primary border-b-2 border-primary pb-1 text-sm font-medium' : 'text-on-surface-variant hover:text-primary transition-colors text-sm'}
              href="/"
            >
              Platform
            </Link>
            <Link
              className={activePage === 'pricing' ? 'text-primary border-b-2 border-primary pb-1 text-sm font-medium' : 'text-on-surface-variant hover:text-primary transition-colors text-sm'}
              href="/pricing"
            >
              Pricing
            </Link>
            <Link
              className={activePage === 'blog' ? 'text-primary border-b-2 border-primary pb-1 text-sm font-medium' : 'text-on-surface-variant hover:text-primary transition-colors text-sm'}
              href="/blog"
            >
              About LeadLinx
            </Link>
            <Link
              className={activePage === 'contact' ? 'text-primary border-b-2 border-primary pb-1 text-sm font-medium' : 'text-on-surface-variant hover:text-primary transition-colors text-sm'}
              href="/contact"
            >
              Need Help?
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-sm py-2 px-6">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
