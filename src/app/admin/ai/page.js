'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import ExportButtons from '@/components/ExportButtons';

const TYPE_LABELS = {
  lead_search: 'Lead Search',
  chat: 'Chat',
  reply_generation: 'Reply Generation',
  lead_filter: 'Lead Filter',
};

const TYPE_COLORS = {
  lead_search: '#ef4444',
  chat: '#0d9488',
  reply_generation: '#f59e0b',
  lead_filter: '#6366f1',
};

export default function AdminAIPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/admin/ai');
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  );

  if (!data || data.error) {
    return (
      <div className="bento-card p-8 text-center">
        <span className="material-symbols-outlined text-error text-4xl mb-4">error</span>
        <h3 className="font-headline text-xl text-on-surface mb-2">Failed to load data</h3>
        <p className="text-on-surface-variant">{data?.error || 'Could not fetch AI metrics'}</p>
        <button onClick={() => loadData()} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
          Retry
        </button>
      </div>
    );
  }

  const profitMargin = data.totalRevenue > 0 
    ? ((data.totalProfit / data.totalRevenue) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">AI Monitor</h1>
          <p className="text-on-surface-variant font-body">Live token consumption, API costs, and per-type usage breakdown.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons currentData={data.costBreakdown || []} currentPageName="AI_Monitor" />
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-all"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Requests <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
          </div>
          <div className="stat-value">{(data.totalRequests || 0).toLocaleString()}</div>
          <div className="stat-trend">{data.searchRequests || 0} searches · {data.chatRequests || 0} chats</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            AI Cost (Raw) <span className="material-symbols-outlined text-sm text-error">payments</span>
          </div>
          <div className="stat-value text-error">${(data.estimatedCost || 0).toFixed(4)}</div>
          <div className="stat-trend">Revenue: ${(data.totalRevenue || 0).toFixed(4)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Net Profit <span className="material-symbols-outlined text-sm text-secondary">trending_up</span>
          </div>
          <div className="stat-value text-secondary">${(data.totalProfit || 0).toFixed(4)}</div>
          <div className="stat-trend">{profitMargin}% margin</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Tokens <span className="material-symbols-outlined text-sm text-tertiary">token</span>
          </div>
          <div className="stat-value text-tertiary">
            {((data.totalInputTokens + data.totalOutputTokens) || 0).toLocaleString()}
          </div>
          <div className="stat-trend">
            {(data.totalInputTokens || 0).toLocaleString()} in · {(data.totalOutputTokens || 0).toLocaleString()} out
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Daily Requests (Last 30 Days)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                <XAxis dataKey="date" stroke="var(--color-on-surface-variant)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-on-surface-variant)" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', borderRadius: '10px', color: 'var(--color-on-surface)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" name="Requests" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top AI Users */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-secondary">person</span>
            Top AI Users
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topUsers} layout="vertical">
                <XAxis type="number" stroke="var(--color-on-surface-variant)" tick={{ fontSize: 11 }} />
                <YAxis dataKey="email" type="category" width={140} stroke="var(--color-on-surface-variant)" tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', borderRadius: '10px', color: 'var(--color-on-surface)' }}
                />
                <Bar dataKey="count" name="Requests" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Breakdown by Type */}
      <div className="bento-card p-6">
        <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-tertiary">receipt_long</span>
          Cost Breakdown by Operation Type
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Requests</th>
                <th>Total Tokens</th>
                <th>Raw AI Cost</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {(data.costBreakdown || []).map(row => (
                <tr key={row._id}>
                  <td className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: TYPE_COLORS[row._id] || '#9ca3af' }}
                    />
                    {TYPE_LABELS[row._id] || row._id}
                  </td>
                  <td className="font-data-value">{(row.requests || 0).toLocaleString()}</td>
                  <td className="font-data-value">{(row.tokens || 0).toLocaleString()}</td>
                  <td className="font-data-value text-error">${(row.rawCost || 0).toFixed(5)}</td>
                  <td className="font-data-value text-secondary">${(row.revenue || 0).toFixed(5)}</td>
                  <td className="font-data-value text-primary">${(row.profit || 0).toFixed(5)}</td>
                </tr>
              ))}
              {(!data.costBreakdown || data.costBreakdown.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center text-on-surface-variant py-8 italic">
                    No usage data yet. AI activity will appear here after the first search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
