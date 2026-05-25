'use client';
import { useState, useEffect, useRef } from 'react';

export default function AdminLogsPage() {
  const [activeTab, setActiveTab] = useState('system');
  
  // System Logs (MongoDB)
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [filter, setFilter] = useState('all');

  // Vercel Runtime Logs
  const [vercelLogs, setVercelLogs] = useState([]);
  const [loadingVercel, setLoadingVercel] = useState(false);
  const [vercelError, setVercelError] = useState(null);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/logs?limit=200')
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .finally(() => setLoadingLogs(false));
  }, []);

  const fetchVercelLogs = async () => {
    setLoadingVercel(true);
    setVercelError(null);
    try {
      const res = await fetch('/api/admin/vercel-logs');
      const data = await res.json();
      if (data.error) {
        setVercelError(data.error);
        setVercelLogs([]);
      } else {
        setVercelLogs(data.logs || []);
        if (data.deploymentId) {
          setDeploymentInfo({
            id: data.deploymentId,
            url: data.deploymentUrl,
            created: data.deploymentCreated,
          });
        }
      }
    } catch (err) {
      setVercelError(err.message);
    } finally {
      setLoadingVercel(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'vercel') {
      fetchVercelLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (autoRefresh && activeTab === 'vercel') {
      intervalRef.current = setInterval(fetchVercelLogs, 10000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, activeTab]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'error': return { icon: 'error', color: 'text-red-400' };
      case 'rate_limit': return { icon: 'speed', color: 'text-amber-400' };
      case 'reddit_failure': return { icon: 'cloud_off', color: 'text-red-400' };
      case 'warning': return { icon: 'warning', color: 'text-amber-400' };
      default: return { icon: 'info', color: 'text-on-surface-variant' };
    }
  };

  const getVercelLevelStyle = (level, type) => {
    if (level === 'error' || type === 'error') return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: 'error', badge: 'bg-red-500/20 text-red-400' };
    if (type === 'response') return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', icon: 'http', badge: 'bg-blue-500/20 text-blue-400' };
    return { bg: 'bg-surface-container border-outline-variant', text: 'text-on-surface-variant', icon: 'terminal', badge: 'bg-surface-container text-on-surface-variant' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">System Logs</h1>
          <p className="text-on-surface-variant font-body">Monitor API errors, monitor runs, and Vercel runtime logs.</p>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-surface-container rounded-2xl w-fit border border-outline-variant">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'system' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[18px]">data_object</span>
          System Logs
        </button>
        <button
          onClick={() => setActiveTab('vercel')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'vercel' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[18px]">deployed_code</span>
          Vercel Runtime
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </button>
      </div>

      {/* ─── SYSTEM LOGS TAB ─── */}
      {activeTab === 'system' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total Logs</div>
              <div className="stat-value">{logs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Errors</div>
              <div className="stat-value text-red-400">{logs.filter(l => l.type === 'error').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rate Limits</div>
              <div className="stat-value text-amber-400">{logs.filter(l => l.type === 'rate_limit').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Reddit Fails</div>
              <div className="stat-value text-red-400">{logs.filter(l => l.type === 'reddit_failure').length}</div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
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

          {loadingLogs ? (
            <div className="skeleton w-full h-64" />
          ) : (
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
          )}
        </>
      )}

      {/* ─── VERCEL RUNTIME LOGS TAB ─── */}
      {activeTab === 'vercel' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchVercelLogs}
              disabled={loadingVercel}
              className="px-4 py-2 rounded-xl bg-surface border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${loadingVercel ? 'animate-spin' : ''}`}>refresh</span>
              {loadingVercel ? 'Fetching...' : 'Refresh'}
            </button>
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 active:scale-95 ${autoRefresh ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-on-surface-variant'}`} />
              {autoRefresh ? 'Live (10s)' : 'Auto-Refresh Off'}
            </button>
            {deploymentInfo && (
              <div className="ml-auto text-xs text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">deployed_code</span>
                <span className="font-mono">{deploymentInfo.id?.slice(0, 12)}...</span>
                <span>·</span>
                <span>{deploymentInfo.url}</span>
              </div>
            )}
          </div>

          {vercelError && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-[24px] shrink-0">error</span>
                <div>
                  <div className="text-sm font-bold text-red-400 mb-1">Vercel API Error</div>
                  <div className="text-xs text-red-300 font-mono">{vercelError}</div>
                  <div className="mt-3 text-xs text-on-surface-variant">
                    To enable Vercel logs, add <code className="bg-surface-container px-1 py-0.5 rounded font-mono">VERCEL_TOKEN</code> to your environment variables in Vercel project settings. Optionally add <code className="bg-surface-container px-1 py-0.5 rounded font-mono">VERCEL_PROJECT_ID</code> and <code className="bg-surface-container px-1 py-0.5 rounded font-mono">VERCEL_TEAM_ID</code>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingVercel && !vercelLogs.length && (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!loadingVercel && !vercelError && vercelLogs.length === 0 && (
            <div className="text-center py-20 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-2xl">
              <span className="material-symbols-outlined text-4xl block mb-3">terminal</span>
              <p>No runtime logs found for the latest deployment.</p>
            </div>
          )}

          {/* Log Lines */}
          <div className="space-y-1 font-mono text-xs">
            {vercelLogs.map((log) => {
              const style = getVercelLevelStyle(log.level, log.type);
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${style.bg} group hover:brightness-110 transition-all`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${style.text} shrink-0 mt-0.5`}>{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`${style.text} break-all leading-relaxed`}>{log.message}</div>
                    {log.path && (
                      <div className="text-on-surface-variant mt-0.5 text-[10px]">{log.path} {log.statusCode ? `→ ${log.statusCode}` : ''}</div>
                    )}
                  </div>
                  <div className="text-on-surface-variant text-[10px] shrink-0 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
                    {log.type || log.level}
                  </span>
                </div>
              );
            })}
          </div>

          {vercelLogs.length > 0 && (
            <div className="text-center text-xs text-on-surface-variant py-2">
              Showing {vercelLogs.length} log events · Auto-refresh: {autoRefresh ? 'ON (10s)' : 'OFF'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
