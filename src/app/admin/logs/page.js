'use client';
import { useState, useEffect } from 'react';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/admin/logs?limit=200')
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'error': return { icon: 'error', color: 'text-hot-pink' };
      case 'rate_limit': return { icon: 'speed', color: 'text-tertiary' };
      case 'reddit_failure': return { icon: 'cloud_off', color: 'text-hot-pink' };
      case 'warning': return { icon: 'warning', color: 'text-tertiary' };
      default: return { icon: 'info', color: 'text-on-surface-variant' };
    }
  };

  if (loading) return <div className="skeleton w-full h-96"></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">System Logs</h1>
          <p className="text-on-surface-variant font-body">API errors, Reddit failures, and rate limits.</p>
        </div>
        <div className="flex gap-2">
          {['all', 'error', 'rate_limit', 'reddit_failure', 'warning'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filter === f 
                  ? 'bg-primary text-white border-primary' 
                  : 'border-border-glass text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Logs</div>
          <div className="stat-value">{logs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Errors</div>
          <div className="stat-value text-hot-pink">{logs.filter(l => l.type === 'error').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rate Limits</div>
          <div className="stat-value text-tertiary">{logs.filter(l => l.type === 'rate_limit').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reddit Fails</div>
          <div className="stat-value text-hot-pink">{logs.filter(l => l.type === 'reddit_failure').length}</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Action</th>
                <th>Error Message</th>
                <th>User</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => {
                const typeInfo = getTypeIcon(log.type);
                return (
                  <tr key={i}>
                    <td>
                      <span className={`flex items-center gap-1.5 text-xs font-data-label ${typeInfo.color}`}>
                        <span className="material-symbols-outlined text-[16px]">{typeInfo.icon}</span>
                        {log.type}
                      </span>
                    </td>
                    <td className="text-sm">{log.action || '—'}</td>
                    <td className="text-sm text-on-surface-variant max-w-[300px] truncate">{log.error || '—'}</td>
                    <td className="text-xs font-data-label text-on-surface-variant">{log.userId || 'system'}</td>
                    <td className="text-xs font-data-label text-on-surface-variant">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>
                    No logs matching this filter. System is clean!
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
