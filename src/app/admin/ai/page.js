'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function AdminAIPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/ai')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton w-full h-96"></div>;
  if (!data || data.error) {
    return (
      <div className="bento-card p-8 text-center">
        <span className="material-symbols-outlined text-error text-4xl mb-4">error</span>
        <h3 className="font-headline text-xl text-on-surface mb-2">Failed to load data</h3>
        <p className="text-on-surface-variant">{data?.error || 'Could not fetch AI metrics'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">AI Monitor</h1>
        <p className="text-on-surface-variant font-body">OpenRouter API usage, costs, and per-user consumption.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Requests <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
          </div>
          <div className="stat-value">{(data.totalRequests || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Lead Filters <span className="material-symbols-outlined text-sm text-secondary">filter_alt</span>
          </div>
          <div className="stat-value">{(data.filterRequests || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Reply Generations <span className="material-symbols-outlined text-sm text-secondary">auto_awesome</span>
          </div>
          <div className="stat-value">{(data.replyRequests || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Est. Total Cost <span className="material-symbols-outlined text-sm text-tertiary">attach_money</span>
          </div>
          <div className="stat-value text-tertiary">${(data.estimatedCost || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Over Time */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Daily Usage (Last 30 Days)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-User Usage */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-secondary">person</span>
            Top AI Users
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topUsers} layout="vertical">
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="email" type="category" width={140} stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px' }}
                  itemStyle={{ color: '#0d9488' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bento-card p-6">
        <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-tertiary">receipt_long</span>
          Cost Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Requests</th>
                <th>Avg Cost/Request</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">filter_alt</span>
                  Lead Filtering
                </td>
                <td className="font-data-value">{(data.filterRequests || 0).toLocaleString()}</td>
                <td className="font-data-value">$0.001</td>
                <td className="font-data-value text-primary">${((data.filterRequests || 0) * 0.001).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
                  Reply Generation
                </td>
                <td className="font-data-value">{(data.replyRequests || 0).toLocaleString()}</td>
                <td className="font-data-value">$0.0005</td>
                <td className="font-data-value text-secondary">${((data.replyRequests || 0) * 0.0005).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
