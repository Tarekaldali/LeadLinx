'use client';
import { useState, useEffect } from 'react';

export default function AdminCostsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/costs?days=${days}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  );
  if (!data || data.error) return <div className="text-error bg-error-container p-4 rounded-xl">{data?.error || 'Error'}</div>;

  const t = data.totals || {};
  const margin = t.totalRevenueUsd > 0 ? ((t.totalProfitUsd / t.totalRevenueUsd) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-on-surface">Chat Cost & Profit</h1>
          <p className="text-on-surface-variant mt-1 font-body">Token usage, AI cost, revenue, and profit per search session.</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="input-field py-2 px-3 w-36 text-sm"
        >
          <option value={1}>Last 1 day</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">AI Cost (raw) <span className="material-symbols-outlined text-sm text-error">payments</span></div>
          <div className="stat-value text-error">${(t.totalRawCostUsd || 0).toFixed(4)}</div>
          <div className="stat-trend">{(t.totalSearches || 0).toLocaleString()} searches</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">Revenue (charged) <span className="material-symbols-outlined text-sm text-primary">monetization_on</span></div>
          <div className="stat-value text-primary">${(t.totalRevenueUsd || 0).toFixed(4)}</div>
          <div className="stat-trend">{(t.totalCredits || 0).toLocaleString()} credits</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">Net Profit <span className="material-symbols-outlined text-sm text-lime-green">trending_up</span></div>
          <div className="stat-value text-lime-green">${(t.totalProfitUsd || 0).toFixed(4)}</div>
          <div className="stat-trend up">{margin}% margin</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">Avg Cost / Search <span className="material-symbols-outlined text-sm text-secondary">calculate</span></div>
          <div className="stat-value">${((t.avgCostPerSearch || 0) * 1000).toFixed(3)}m</div>
          <div className="stat-trend">{(t.totalLeads || 0).toLocaleString()} leads found</div>
        </div>
      </div>

      {/* Per-user breakdown */}
      {data.perUser?.length > 0 && (
        <div className="bento-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border-glass flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">group</span>
            <h2 className="font-headline text-base text-on-surface">Revenue by User</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  {['User', 'Plan', 'Searches', 'AI Cost', 'Revenue', 'Profit', 'Profit %', 'Leads'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass">
                {data.perUser.map((u, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface font-medium">{u.user?.email || u._id?.substring(0, 8) + '...'}</td>
                    <td className="px-4 py-3"><span className="badge badge-growth capitalize">{u.user?.plan || 'free'}</span></td>
                    <td className="px-4 py-3 font-data-value">{u.searches}</td>
                    <td className="px-4 py-3 text-error font-data-value">${(u.rawCost || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-primary font-data-value">${(u.revenue || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-lime-green font-data-value">${(u.profit || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 font-data-value text-xs text-on-surface-variant">
                      {u.revenue > 0 ? ((u.profit / u.revenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="px-4 py-3 font-data-value">{u.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-chat breakdown */}
      {data.searches?.length > 0 && (
        <div className="bento-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border-glass flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">chat_bubble</span>
            <h2 className="font-headline text-base text-on-surface">Cost per Chat Session</h2>
            <span className="text-xs text-on-surface-variant ml-auto">(Top {data.searches.length} sessions)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Chat ID', 'Searches', 'Tokens (In/Out)', 'AI Cost', 'Revenue', 'Profit', 'Credits', 'Leads'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass">
                {data.searches.map((s, i) => {
                  const profit = (s.totalProfit || 0);
                  return (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 font-data-value text-on-surface-variant text-xs">{(s._id || 'direct').substring(0, 12)}…</td>
                      <td className="px-4 py-3 font-data-value">{s.searches}</td>
                      <td className="px-4 py-3 font-data-value text-xs text-on-surface-variant">
                        {s.promptTokens?.toLocaleString()} / {s.completionTokens?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-error font-data-value">${(s.totalRawCost || 0).toFixed(5)}</td>
                      <td className="px-4 py-3 text-primary font-data-value">${(s.totalCost || 0).toFixed(5)}</td>
                      <td className={`px-4 py-3 font-data-value ${profit >= 0 ? 'text-lime-green' : 'text-error'}`}>${profit.toFixed(5)}</td>
                      <td className="px-4 py-3 font-data-value">{s.creditsCharged}</td>
                      <td className="px-4 py-3 font-data-value">{s.totalLeads}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.searches?.length === 0 && (
        <div className="bento-card p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-3">analytics</span>
          <p className="text-on-surface-variant">No search data yet for this period. Run some searches first!</p>
        </div>
      )}
    </div>
  );
}
