'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/dashboard?q=${encodeURIComponent(q)}`);
  };

  const examples = [
    'alternatives to Salesforce',
    'need better project management',
    'frustrated with Shopify fees',
    'looking for email marketing tool',
  ];

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Describe what leads you're looking for..."
          className="w-full bg-white border-2 border-outline-variant rounded-2xl py-5 pl-14 pr-36 text-lg font-body text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-3 top-3 bottom-3 btn-teal px-6 rounded-xl flex items-center gap-2 font-semibold"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          Find Leads
        </button>
      </form>
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-on-surface-variant">Try:</span>
        {examples.map(ex => (
          <button
            key={ex}
            type="button"
            onClick={() => { setQuery(ex); setTimeout(() => router.push(`/dashboard?q=${encodeURIComponent(ex)}`), 50); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-border-glass transition-colors text-on-surface"
          >
            &ldquo;{ex}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
