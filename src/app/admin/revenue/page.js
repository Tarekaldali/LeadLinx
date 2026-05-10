'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

export default function AdminRevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/revenue')
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
        <p className="text-on-surface-variant">{data?.error || 'Could not fetch revenue metrics'}</p>
      </div>
    );
  }

  const COLORS = ['#dc2626', '#0d9488', '#f59e0b', '#6b7280'];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Revenue Analytics</h1>
        <p className="text-on-surface-variant font-body">Subscriptions, churn, and plan distribution metrics.</p>
      </header>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            MRR <span className="material-symbols-outlined text-sm text-primary">trending_up</span>
          </div>
          <div className="stat-value text-primary">${(data.mrr || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Revenue <span className="material-symbols-outlined text-sm text-secondary">account_balance</span>
          </div>
          <div className="stat-value">${(data.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Paid Users <span className="material-symbols-outlined text-sm text-lime-green">person</span>
          </div>
          <div className="stat-value">{data.paidUsers || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Churn Rate <span className="material-symbols-outlined text-sm text-hot-pink">trending_down</span>
          </div>
          <div className="stat-value text-hot-pink">{data.churnRate || 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">show_chart</span>
            Revenue Trend (Last 6 Months)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} dot={{ fill: '#dc2626', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-secondary">donut_large</span>
            Plan Distribution
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.planDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="count"
                  nameKey="_id"
                  label={({ _id, count }) => `${_id}: ${count}`}
                >
                  {data.planDistribution.map((entry, index) => (
                    <Cell key={entry._id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bento-card p-6">
        <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-secondary">list_alt</span>
          Recent Subscribers
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>MRR Contribution</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentSubscribers || []).map((sub, i) => (
                <tr key={i}>
                  <td>
                    <div className="font-medium text-sm">{sub.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${sub.plan === 'enterprise' ? 'badge-enterprise' : sub.plan === 'growth' ? 'badge-growth' : 'badge-starter'}`}>
                      {sub.plan || 'starter'}
                    </span>
                  </td>
                  <td className="font-data-value text-primary">${sub.mrr}</td>
                  <td className="text-xs text-on-surface-variant font-data-label">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!data.recentSubscribers || data.recentSubscribers.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-on-surface-variant">No subscribers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
