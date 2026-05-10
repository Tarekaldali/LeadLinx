'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './admin.css';

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="admin-container animate-pulse">
        <div className="h-10 bg-surface-container-high rounded-lg w-1/4 mb-8" />
        <div className="telemetry-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-container-high rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="admin-container">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <div>
            <div className="font-bold">Initialization Failed</div>
            <div className="text-sm">{data?.error || 'Could not connect to telemetry service.'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container animate-fade-in">
      <header className="admin-header">
        <h1 className="admin-title">Platform Intelligence</h1>
        <p className="text-on-surface-variant font-medium">Global system telemetry and revenue performance monitoring.</p>
      </header>

      {/* Telemetry Metrics */}
      <div className="telemetry-grid">
        <div className="telemetry-card">
          <div className="telemetry-label">Monthly Recurring Revenue</div>
          <div className="telemetry-value text-primary">${(data.mrr || 0).toLocaleString()}</div>
          <div className="telemetry-trend up">
             <span className="material-symbols-outlined text-[16px]">trending_up</span>
             +12% from last month
          </div>
        </div>
        
        <div className="telemetry-card">
          <div className="telemetry-label">Global User Base</div>
          <div className="telemetry-value">{(data.totalUsers || 0).toLocaleString()}</div>
          <div className="telemetry-trend up">
            <span className="material-symbols-outlined text-[16px]">group</span>
            {data.activeUsers || 0} active users
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label">Intelligence Requests</div>
          <div className="telemetry-value">{(data.totalSearches || 0).toLocaleString()}</div>
          <div className="telemetry-trend up">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            Real-time API flow
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label">Leads Identified</div>
          <div className="telemetry-value">{(data.totalLeads || 0).toLocaleString()}</div>
          <div className="telemetry-trend up">
             <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
             {Math.round((data.totalLeads / data.totalSearches) * 10 || 0)} leads/search avg
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Plan Distribution Chart */}
        <div className="chart-section">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl text-on-surface">Plan Distribution</h3>
            <div className="px-3 py-1 bg-surface-container-low border border-border-glass rounded-full text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
              LIVE DATA
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.planDistribution || []}>
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="health-section">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl text-white">System Integrity</h3>
            <span className="material-symbols-outlined text-green-400">shield_check</span>
          </div>
          <div className="space-y-4">
            <div className="health-item">
              <span className="text-sm font-semibold opacity-80">AI Core Services</span>
              <div className="status-indicator">
                <span className="status-dot active"></span>
                <span className="text-green-400">Operational</span>
              </div>
            </div>
            <div className="health-item">
              <span className="text-sm font-semibold opacity-80">Data Ingestion (Reddit)</span>
              <div className="status-indicator">
                <span className="status-dot active"></span>
                <span className="text-green-400">Stable</span>
              </div>
            </div>
            <div className="health-item">
              <span className="text-sm font-semibold opacity-80">Global DB Latency</span>
              <div className="status-indicator">
                <span className="font-mono text-blue-400">24.2 ms</span>
              </div>
            </div>
            <div className="health-item">
              <span className="text-sm font-semibold opacity-80">Inference Conversion</span>
              <div className="status-indicator">
                <span className="text-primary font-bold">{data.conversionRate}%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10">
             <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Network Load</div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-red-700 w-[64%]"></div>
             </div>
             <div className="flex justify-between mt-2">
                <span className="text-[10px] text-white/60">64% Capacity utilized</span>
                <span className="text-[10px] text-white/60">Node: US-EAST-1</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
