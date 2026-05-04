'use client';
import { useState, useEffect } from 'react';

export default function AdminAlertsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/alerts')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton w-full h-96"></div>;
  if (!data) return <div className="text-on-surface-variant">Failed to load alert data.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Alert Monitor</h1>
        <p className="text-on-surface-variant font-body">Smart alert delivery status and failure tracking.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Total Alerts <span className="material-symbols-outlined text-sm text-primary">notifications</span>
          </div>
          <div className="stat-value">{data.totalAlerts.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Delivered <span className="material-symbols-outlined text-sm text-lime-green">check_circle</span>
          </div>
          <div className="stat-value text-lime-green">{data.delivered.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Failed <span className="material-symbols-outlined text-sm text-hot-pink">error</span>
          </div>
          <div className="stat-value text-hot-pink">{data.failed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex justify-between">
            Delivery Rate <span className="material-symbols-outlined text-sm text-secondary">percent</span>
          </div>
          <div className="stat-value text-secondary">{data.deliveryRate}%</div>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="bento-card p-6">
        <h3 className="font-headline text-lg mb-6 flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary">history</span>
          Recent Alerts
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentAlerts || []).map((alert, i) => (
                <tr key={i}>
                  <td className="text-sm">{alert.userEmail || 'N/A'}</td>
                  <td>
                    <span className={`badge ${alert.type === 'email' ? 'badge-growth' : 'badge-enterprise'}`}>
                      {alert.type || 'email'}
                    </span>
                  </td>
                  <td className="text-sm text-on-surface-variant">{alert.trigger || 'Score ≥ 9'}</td>
                  <td>
                    <span className={`flex items-center gap-1.5 text-xs font-data-label ${alert.status === 'delivered' ? 'text-lime-green' : 'text-hot-pink'}`}>
                      <span className={`w-2 h-2 rounded-full ${alert.status === 'delivered' ? 'bg-lime-green' : 'bg-hot-pink'}`}></span>
                      {alert.status || 'pending'}
                    </span>
                  </td>
                  <td className="text-xs text-on-surface-variant font-data-label">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!data.recentAlerts || data.recentAlerts.length === 0) && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl block mb-2">notifications_off</span>
                    No alerts triggered yet. Alerts fire when a lead scores ≥ 9.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Notice */}
      <div className="p-4 bg-primary-container/30 rounded-xl border border-primary/10 text-sm text-on-primary-container flex items-start gap-3">
        <span className="material-symbols-outlined text-primary shrink-0">info</span>
        <div>
          <strong>Smart Alert Configuration:</strong> Alerts automatically trigger when a lead scores ≥ 9 on the intent scale. 
          Configure email and Telegram delivery in your notification settings.
        </div>
      </div>
    </div>
  );
}
