'use client';
import { useState, useEffect } from 'react';

export default function AdminCostsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [type, setType] = useState('all');

  // Pagination and Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState('totalCost');
  const [sortDir, setSortDir] = useState(-1);

  const fetchData = () => {
    setLoading(true);
    const qs = new URLSearchParams({
      days,
      type,
      page: page.toString(),
      limit: limit.toString(),
      search,
      sortField,
      sortDir: sortDir.toString()
    });

    fetch(`/api/admin/costs?${qs.toString()}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [days, type, page, limit, search, sortField, sortDir]);

  // Real-time: auto-refresh every 30s to capture live AI usage
  useEffect(() => {
    const interval = setInterval(() => {
      const qs = new URLSearchParams({ days, type, page: page.toString(), limit: limit.toString(), search, sortField, sortDir: sortDir.toString() });
      fetch(`/api/admin/costs?${qs.toString()}`)
        .then(r => r.json())
        .then(setData)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [days, type, page, limit, search, sortField, sortDir]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir * -1);
    } else {
      setSortField(field);
      setSortDir(-1);
    }
    setPage(1);
  };

  if (loading && !data) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  );
  if (!data || data.error) return <div className="text-error bg-error-container p-4 rounded-xl">{data?.error || 'Error'}</div>;

  const t = data.totals || {};
  const margin = t.totalRevenueUsd > 0 ? ((t.totalProfitUsd / t.totalRevenueUsd) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-on-surface">Chat Cost & Profit</h1>
          <p className="text-on-surface-variant mt-1 font-body">Token usage, AI cost, revenue, and profit per search session.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="input-field py-2 px-3 w-40 text-sm"
          >
            <option value="all">All Activity</option>
            <option value="lead_search">Lead Searches</option>
            <option value="chat">Chat Sessions</option>
            <option value="reply_generation">Reply Generation</option>
            <option value="lead_filter">Lead Filtering</option>
          </select>
          <select
            value={days}
            onChange={e => { setDays(e.target.value); setPage(1); }}
            className="input-field py-2 px-3 w-40 text-sm"
          >
            <option value="1">Last 1 day</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All Time</option>
          </select>
        </div>
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
            <h2 className="font-headline text-base text-on-surface">Revenue by User (Top 20)</h2>
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
      <div className="bento-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border-glass flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">chat_bubble</span>
            <h2 className="font-headline text-base text-on-surface">Cost per Chat Session</h2>
            <span className="text-xs text-on-surface-variant ml-2">(Total: {data.totalSearchesCount})</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search email, chat ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field py-1.5 px-3 text-sm w-64"
            />
            <button type="submit" className="action-btn py-1.5 px-3 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">search</span>
            </button>
          </form>
        </div>

        <div className="overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                {[
                  { label: 'Chat ID', field: '_id' },
                  { label: 'User Email', field: 'userEmail' },
                  { label: 'Searches', field: 'searches' },
                  { label: 'Tokens (In/Out)', field: null },
                  { label: 'AI Cost', field: 'totalRawCost' },
                  { label: 'Revenue', field: 'totalCost' },
                  { label: 'Profit', field: 'totalProfit' },
                  { label: 'Credits', field: 'creditsCharged' },
                  { label: 'Leads', field: 'totalLeads' }
                ].map(col => (
                  <th
                    key={col.label}
                    className={`text-left px-4 py-3 font-data-label text-on-surface-variant text-xs ${col.field ? 'cursor-pointer hover:text-primary transition-colors select-none' : ''}`}
                    onClick={() => col.field && handleSort(col.field)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.field && sortField === col.field && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortDir === -1 ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {data.searches?.map((s, i) => {
                const profit = (s.totalProfit || 0);
                return (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 font-data-value text-on-surface-variant text-xs">{(s._id || 'direct').substring(0, 12)}…</td>
                    <td className="px-4 py-3 font-medium text-on-surface">{s.userEmail || s.userId?.substring(0, 8) + '...'}</td>
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
              {data.searches?.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                    No matching chat sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border-glass flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">
              Page {data.currentPage} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border-glass text-sm disabled:opacity-50 hover:bg-surface-container"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 rounded-lg border border-border-glass text-sm disabled:opacity-50 hover:bg-surface-container"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
