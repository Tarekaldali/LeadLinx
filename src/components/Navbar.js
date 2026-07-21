import Link from 'next/link';
import NavAuth from './NavAuth';

export default function Navbar({ activePage = 'platform' }) {
  return (
    <nav aria-label="Main navigation" role="navigation" className="bg-surface/80 backdrop-blur-xl border-b border-border-glass w-full top-0 sticky z-50 transition-colors">
      <div className="flex justify-between items-center w-full px-6 py-3 max-w-[1920px] mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-headline font-bold text-2xl tracking-tight flex items-center">
              <span className="text-primary">Lead</span>
              <span className="text-black dark:text-white">Linx</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
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
          <NavAuth />
        </div>
      </div>
    </nav>
  );
}
