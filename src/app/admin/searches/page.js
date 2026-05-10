'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminSearchesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/searches')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton w-full h-96"></div>;
  if (!data) return <div className="text-on-surface-variant">Failed to load search analytics.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Search Analytics</h1>
        <p className="text-on-surface-variant font-body">Keyword trends, top subreddits, and usage patterns.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Keywords */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            Top Keywords
          </h3>
          {data.topKeywords?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topKeywords.slice(0, 10)} layout="vertical">
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="_id" type="category" width={120} stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: '#dc2626' }}
                  />
                  <Bar dataKey="count" fill="#dc2626" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm">No search data yet.</p>
          )}
        </div>

        {/* Top Subreddits */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-secondary">forum</span>
            Top Subreddits
          </h3>
          {data.topSubreddits?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topSubreddits.slice(0, 10)} layout="vertical">
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="_id" type="category" width={120} stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: '#0d9488' }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm">No search data yet.</p>
          )}
        </div>
      </div>

      {/* Recent Searches Table */}
      <div className="bento-card p-6">
        <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary">history</span>
          Recent Searches
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Keywords</th>
                <th>Subreddits</th>
                <th>Results</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentSearches || []).slice(0, 20).map((search, i) => (
                <tr key={i}>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {search.keywords?.map((k, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-lg bg-primary-container/50 text-xs text-primary border border-primary/10">
                          {k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {search.subreddits?.map((s, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-lg bg-secondary-container/50 text-xs text-secondary border border-secondary/10">
                          r/{s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="font-data-value">{search.resultsCount || 0}</td>
                  <td className="text-xs text-on-surface-variant font-data-label">
                    {new Date(search.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!data.recentSearches || data.recentSearches.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-on-surface-variant">No searches recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
