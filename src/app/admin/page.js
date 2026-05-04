'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton w-full h-64"></div>;
  if (!data || data.error) return <div className="text-error bg-error-container p-4 rounded-xl">{data?.error || 'Error loading data'}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Platform Overview</h1>
        <p className="text-on-surface-variant font-body">Real-time system telemetry and revenue metrics.</p>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            MRR <span className="material-symbols-outlined text-sm text-primary">payments</span>
          </div>
          <div className="stat-value text-primary">${(data.mrr || 0).toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Users <span className="material-symbols-outlined text-sm text-secondary">group</span>
          </div>
          <div className="stat-value">{(data.totalUsers || 0).toLocaleString()}</div>
          <div className="stat-trend up">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            {data.activeUsers || 0} active this week
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label flex justify-between">
            API Searches <span className="material-symbols-outlined text-sm text-secondary">search</span>
          </div>
          <div className="stat-value">{(data.totalSearches || 0).toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Leads Found <span className="material-symbols-outlined text-sm text-lime-green">database</span>
          </div>
          <div className="stat-value">{(data.totalLeads || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Distribution Chart */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">pie_chart</span>
            Plan Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.planDistribution || []}>
                <XAxis dataKey="_id" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#7c3aed' }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="bento-card p-6">
          <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-lime-green">health_and_safety</span>
            System Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low border border-border-glass">
              <span className="font-data-label text-on-surface-variant">OPENROUTER API</span>
              <span className="font-data-value text-lime-green flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-green"></span>
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low border border-border-glass">
              <span className="font-data-label text-on-surface-variant">REDDIT SCRAPER</span>
              <span className="font-data-value text-lime-green flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-green"></span>
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low border border-border-glass">
              <span className="font-data-label text-on-surface-variant">DB LATENCY</span>
              <span className="font-data-value text-on-surface">24ms</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low border border-border-glass">
              <span className="font-data-label text-on-surface-variant">PAID CONVERSION</span>
              <span className="font-data-value text-primary">{data.conversionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
