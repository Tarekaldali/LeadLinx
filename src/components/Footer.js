import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-surface-dim w-full py-8 border-t border-border-glass">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-sm font-bold text-on-surface">LeadLinx</span>
          <span className="text-xs text-on-surface-variant">© 2026 LeadLinx Intelligence. All rights reserved.</span>
        </div>
        <div className="flex gap-6 mt-6 md:mt-0">
          <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/privacy">Privacy Policy</Link>
          <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/terms">Terms of Service</Link>
          <Link className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="/blog">Blog</Link>
        </div>
      </div>
    </footer>
  );
}
