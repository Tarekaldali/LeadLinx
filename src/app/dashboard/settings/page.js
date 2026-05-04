'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [negativeKeywords, setNegativeKeywords] = useState([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/settings/keywords')
      .then(res => res.json())
      .then(data => {
        setNegativeKeywords(data.negativeKeywords || []);
        setEmailAlerts(data.emailAlerts ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (!keyword || negativeKeywords.includes(keyword)) return;
    setNegativeKeywords(prev => [...prev, keyword]);
    setNewKeyword('');
  };

  const removeKeyword = (keyword) => {
    setNegativeKeywords(prev => prev.filter(k => k !== keyword));
  };

  const saveKeywords = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negativeKeywords, emailAlerts }),
      });
      if (res.ok) {
        showToast('Settings saved!');
      } else {
        showToast('Failed to save', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-64 w-full" />;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline mb-2 text-on-surface">Settings</h1>
        <p className="text-on-surface-variant font-body">Configure your lead generation preferences.</p>
      </header>

      {/* Negative Keywords */}
      <div className="bento-card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-hot-pink">block</span>
          <h2 className="font-headline text-lg text-on-surface">Negative Keywords</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Posts containing these words will be filtered out <strong>before</strong> AI processing, saving you credits.
        </p>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="e.g., hiring, job, intern"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          />
          <button onClick={addKeyword} className="btn-ghost whitespace-nowrap">
            <span className="material-symbols-outlined text-sm mr-1">add</span>
            Add
          </button>
        </div>

        {negativeKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-6">
            {negativeKeywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container/50 text-error text-xs font-medium border border-error/10">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-error/80 cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant mb-6">No negative keywords set. Add some to filter out irrelevant posts.</p>
        )}

        <button onClick={saveKeywords} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Smart Alerts */}
      <div className="bento-card p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
              <h2 className="font-headline text-lg text-on-surface">Smart Alerts</h2>
            </div>
            <p className="text-sm text-on-surface-variant">
              Receive immediate email notifications when our AI detects a high-intent lead (score ≥ 9).
            </p>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={emailAlerts} 
                onChange={(e) => {
                  setEmailAlerts(e.target.checked);
                }} 
              />
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border-glass">
          <button onClick={saveKeywords} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
