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
        { href: '/admin', icon: 'monitoring', label: 'Overview', exact: true },
        { href: '/admin/users', icon: 'group', label: 'Users' },
        { href: '/admin/revenue', icon: 'payments', label: 'Revenue' },
        { href: '/admin/invoices', icon: 'receipt', label: 'Invoices' },
        { href: '/admin/costs', icon: 'receipt_long', label: 'Chat Costs & Profit' },
        { href: '/admin/chats', icon: 'forum', label: 'Chat History' },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/admin/ai', icon: 'smart_toy', label: 'AI Monitor' },
        { href: '/admin/logs', icon: 'data_object', label: 'System Logs' },
        { href: '/admin/support', icon: 'support_agent', label: 'Support Tickets' },
        { href: '/admin/settings', icon: 'settings', label: 'Settings' },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/blog', icon: 'edit_note', label: 'About LeadLinx Manager' },
        { href: '/admin/pricing', icon: 'sell', label: 'Pricing Plans' },
        { href: '/admin/insights', icon: 'lightbulb', label: 'Opportunity Insights' },
      ],
    },
  ];

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href) && pathname !== '/admin';
  };

  return (
    <div className="flex bg-sidebar min-h-screen">
      {/* Ensure admin is never indexed */}
      <meta name="robots" content="noindex,nofollow" />
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-72 bg-sidebar border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-40 transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-red-500 text-[20px]">shield</span>
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-sidebar-fg block leading-none">Admin Center</span>
              <span className="text-[9px] font-black text-sidebar-muted tracking-[0.2em] uppercase mt-1">LeadLinx OS</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-6">
          {navSections.map(section => (
            <div key={section.label}>
              <div className="text-[10px] font-black text-sidebar-muted tracking-[0.2em] px-4 mb-3 uppercase opacity-50">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive(item)
                        ? 'bg-surface shadow-sm border border-sidebar-border text-sidebar-fg'
                        : 'text-sidebar-muted hover:text-sidebar-fg hover:bg-surface/50'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isActive(item) ? 'text-[#ff3b30]' : ''}`}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-sidebar-muted hover:text-sidebar-fg hover:bg-surface/50 transition-all">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            User Dashboard
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 mt-1 bg-surface/30 rounded-2xl border border-white/50">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-md shadow-red-500/20">
              <span className="text-[10px] font-black text-white uppercase">
                {(user?.name || user?.email || 'A').substring(0, 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-sidebar-fg truncate">{user?.name}</div>
              <div className="text-[9px] font-black text-sidebar-muted uppercase tracking-widest">{user?.role || 'Admin'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 bg-surface-dim min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-sidebar border-b border-sidebar-border p-4 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="text-sidebar-fg">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-sidebar-fg text-sm">Admin Center</span>
          <div className="w-8" />
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
