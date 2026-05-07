'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useSession } from "next-auth/react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  const loading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && user?.role !== 'admin') {
      router.push("/dashboard");
    }
  }, [status, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sidebar-muted text-sm">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const navSections = [
    {
      label: 'Analytics',
      items: [
        { href: '/admin',          icon: 'monitoring',            label: 'Overview',         exact: true },
        { href: '/admin/users',    icon: 'group',                 label: 'Users' },
        { href: '/admin/revenue',  icon: 'payments',              label: 'Revenue' },
        { href: '/admin/costs',    icon: 'receipt_long',          label: 'Chat Costs & Profit' },
        { href: '/admin/searches', icon: 'troubleshoot',          label: 'Search Analytics' },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/admin/ai',       icon: 'smart_toy',             label: 'AI Monitor' },
        { href: '/admin/alerts',   icon: 'notifications_active',  label: 'Alerts' },
        { href: '/admin/logs',     icon: 'data_object',           label: 'System Logs' },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/blog',     icon: 'edit_note',             label: 'Blog Manager' },
        { href: '/admin/pricing',  icon: 'sell',                  label: 'Pricing Plans' },
        { href: '/admin/insights', icon: 'lightbulb',             label: 'Opportunity Insights' },
      ],
    },
  ];

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href) && pathname !== '/admin';
  };

  return (
    <div className="flex bg-sidebar min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-40 transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Header */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400 text-base">shield</span>
            </div>
            <span className="text-base font-bold tracking-tight text-sidebar-fg">Admin Center</span>
          </div>
          <div className="text-[10px] font-data-label text-sidebar-muted tracking-widest ml-[42px]">SYSTEM OWNER</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label} className="mb-5">
              <div className="text-[10px] font-data-label text-sidebar-muted tracking-widest px-3 mb-2 uppercase">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`sidebar-item ${isActive(item) ? 'active' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                    {item.href === '/admin/costs' && (
                      <span className="ml-auto text-[9px] font-data-label text-primary bg-primary/10 px-1.5 py-0.5 rounded">NEW</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Link href="/dashboard" className="sidebar-item text-sidebar-muted hover:text-sidebar-fg">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-red-400 uppercase">
                {(user?.name || user?.email || 'A').substring(0, 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-sidebar-fg truncate">{user?.email}</div>
              <div className="text-[10px] text-sidebar-muted">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 bg-surface-dim min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-sidebar border-b border-sidebar-border p-4 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="text-sidebar-fg">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-sidebar-fg">Admin Center</span>
          <div />
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
