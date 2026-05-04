'use client';
import { useState, useEffect } from 'react';

export default function AdminInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/insights')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton w-full h-96"></div>;
  if (!data) return <div className="text-on-surface-variant">Failed to load insights.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Opportunity Insights</h1>
        <p className="text-on-surface-variant font-body">Data-driven opportunities from your platform&apos;s usage patterns.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* High-Demand Keywords */}
        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            <h3 className="font-headline text-lg text-on-surface">High-Demand Keywords</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Most searched keywords across all users — potential content or feature opportunities.</p>
          <div className="space-y-2">
            {(data.highDemandKeywords || []).map((kw, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-glass">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-data-value text-primary w-6">#{i + 1}</span>
                  <span className="text-sm font-medium text-on-surface">{kw._id}</span>
                </div>
                <span className="text-xs font-data-value text-on-surface-variant">{kw.count} searches</span>
              </div>
            ))}
            {(!data.highDemandKeywords || data.highDemandKeywords.length === 0) && (
              <p className="text-sm text-on-surface-variant py-4 text-center">Not enough search data yet.</p>
            )}
          </div>
        </div>

        {/* High-Intent Posts */}
        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-lime-green">local_fire_department</span>
            <h3 className="font-headline text-lg text-on-surface">High-Intent Trends</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Subreddits with the most high-scoring leads — prioritize these communities.</p>
          <div className="space-y-2">
            {(data.highIntentSubreddits || []).map((sub, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-glass">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-data-value text-secondary w-6">#{i + 1}</span>
                  <span className="text-sm font-medium text-on-surface">r/{sub._id}</span>
                </div>
                <span className="text-xs font-data-value text-on-surface-variant">{sub.count} leads</span>
              </div>
            ))}
            {(!data.highIntentSubreddits || data.highIntentSubreddits.length === 0) && (
              <p className="text-sm text-on-surface-variant py-4 text-center">Not enough data yet.</p>
            )}
          </div>
        </div>

        {/* SaaS Feature Ideas */}
        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-tertiary">lightbulb</span>
            <h3 className="font-headline text-lg text-on-surface">SaaS Feature Ideas</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Based on user search patterns and platform behavior.</p>
          <div className="space-y-3">
            {[
              { idea: 'Automated daily digest emails for top keywords', impact: 'High', status: 'Planned' },
              { idea: 'CRM integration (HubSpot, Salesforce export)', impact: 'High', status: 'Backlog' },
              { idea: 'Subreddit health scoring & recommendations', impact: 'Medium', status: 'Idea' },
              { idea: 'Multi-language post detection', impact: 'Medium', status: 'Idea' },
              { idea: 'Chrome extension for inline Reddit reply', impact: 'High', status: 'Backlog' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-glass">
                <span className="text-sm text-on-surface flex-1">{item.idea}</span>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className={`text-[10px] font-data-label px-2 py-0.5 rounded ${item.impact === 'High' ? 'bg-lime-green/10 text-lime-green' : 'bg-tertiary-container text-tertiary'}`}>
                    {item.impact}
                  </span>
                  <span className="text-[10px] font-data-label text-on-surface-variant">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Content Ideas */}
        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-secondary">edit_note</span>
            <h3 className="font-headline text-lg text-on-surface">SEO Content Ideas</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Blog topics derived from high-search-volume keywords on your platform.</p>
          <div className="space-y-3">
            {(data.seoIdeas || [
              'How to Find [Keyword] Leads on Reddit in 2024',
              'Best Subreddits for B2B Lead Generation',
              'Reddit vs LinkedIn for Sales Prospecting',
              'How to Write Non-Spammy Reddit Replies',
              'AI-Powered Social Selling: A Complete Guide',
            ]).map((idea, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-border-glass">
                <span className="material-symbols-outlined text-secondary text-sm">article</span>
                <span className="text-sm text-on-surface">{idea}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
