'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useTheme } from 'next-themes';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'account', label: 'Account', icon: 'shield' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
  { id: 'preferences', label: 'Preferences', icon: 'tune' },
];

export default function SettingsContent() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Profile Form
  const [name, setName] = useState('');
  
  // Preferences
  const [negativeKeywords, setNegativeKeywords] = useState([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setName(session.user.name || '');
    }
  }, [status, session]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/settings/keywords')
      .then(res => res.json())
      .then(data => {
        setNegativeKeywords(data.negativeKeywords || []);
        setEmailAlerts(data.emailAlerts ?? true);
        setWeeklyReports(data.weeklyReports ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast('Profile updated successfully');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
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

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negativeKeywords, emailAlerts, weeklyReports }),
      });
      if (res.ok) {
        showToast('Preferences saved');
      } else {
        showToast('Failed to save preferences', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex flex-col md:flex-row gap-8 animate-fade-in p-8">
        <div className="w-full md:w-64 skeleton h-[200px] rounded-xl shrink-0" />
        <div className="flex-1 space-y-6">
          <div className="skeleton h-64 w-full rounded-2xl" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const user = session?.user;
  const isOAuth = user?.image || !user?.password;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in p-4 sm:p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Settings</h1>
        <p className="text-[#86868b] mt-1 font-medium">Manage your account, preferences, and extraction filters.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white shadow-sm border border-[#e5e5e7] text-[#1d1d1f]' 
                    : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-gray-100/50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'text-[#ff3b30]' : ''}`}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-8">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[28px] border border-[#e5e5e7] shadow-sm overflow-hidden animate-in">
              <div className="px-8 py-6 border-b border-[#f2f2f2]">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Profile Information</h2>
                <p className="text-xs text-[#86868b] mt-0.5">How you appear to the LeadLinx ecosystem.</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl focus:ring-2 focus:ring-[#ff3b30]/20 focus:border-[#ff3b30] text-sm font-medium outline-none transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                      className="w-full px-4 py-3 bg-[#f2f2f2] border border-[#e5e5e7] rounded-xl text-gray-400 text-sm font-medium outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              <div className="px-8 py-4 bg-[#fbfbfd] border-t border-[#f2f2f2] flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#ff3b30] text-white rounded-xl text-sm font-bold hover:bg-[#d72f25] transition-all shadow-lg shadow-red-500/10 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6 animate-in">
              <div className="bg-white rounded-[28px] border border-[#e5e5e7] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f2f2f2]">
                  <h2 className="text-lg font-bold text-[#1d1d1f]">Security</h2>
                  <p className="text-xs text-[#86868b] mt-0.5">Manage your credentials and providers.</p>
                </div>
                <div className="p-8 space-y-8">
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Connected Auth</h3>
                    <div className="flex items-center justify-between p-5 bg-[#fbfbfd] border border-[#e5e5e7] rounded-2xl max-w-lg shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e7] flex items-center justify-center shadow-sm">
                          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1d1d1f]">Google Cloud Auth</p>
                          <p className="text-[10px] text-[#28cd41] font-black uppercase tracking-widest">Linked</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#ff3b30]/5 rounded-[28px] border border-[#ff3b30]/10 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-base font-bold text-[#ff3b30]">Danger Zone</h3>
                  <p className="text-xs text-[#ff3b30]/70 mt-0.5">Permanently delete your account and all intelligence data.</p>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-2.5 bg-[#ff3b30] text-white rounded-xl text-sm font-bold hover:bg-[#d72f25] transition-all shadow-lg shadow-red-500/20 shrink-0"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-[28px] border border-[#e5e5e7] shadow-sm overflow-hidden animate-in">
              <div className="px-8 py-6 border-b border-[#f2f2f2]">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Billing</h2>
                <p className="text-xs text-[#86868b] mt-0.5">Manage your growth plan and invoices.</p>
              </div>
              <div className="p-8">
                <div className="bg-[#f5f5f7] rounded-2xl p-8 border border-[#e5e5e7] max-w-2xl flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Plan</p>
                    <div className="flex items-center gap-3">
                      <h3 className="text-3xl font-black text-[#1d1d1f] capitalize">{user?.plan || 'Free'}</h3>
                      <span className="px-2.5 py-1 bg-[#28cd41]/10 text-[#28cd41] text-[10px] font-black rounded-full border border-[#28cd41]/20">PRO</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/stripe/portal', { method: 'POST' });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                      }}
                      className="px-6 py-2.5 bg-[#1d1d1f] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10 text-center"
                    >
                      Portal Management
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-8 animate-in">
              <div className="bg-white rounded-[28px] border border-[#e5e5e7] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f2f2f2]">
                  <h2 className="text-lg font-bold text-[#1d1d1f]">Appearance</h2>
                  <p className="text-xs text-[#86868b] mt-0.5">Customize your interface experience.</p>
                </div>
                <div className="p-8">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                        mounted && theme === 'light' ? 'border-[#ff3b30] bg-[#ff3b30]/5' : 'border-[#f2f2f2] hover:border-[#e5e5e7]'
                      }`}
                    >
                      <div className="w-16 h-12 rounded-lg bg-white border border-[#e5e5e7] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[#86868b]">light_mode</span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${mounted && theme === 'light' ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>Quartz Light</span>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                        mounted && theme === 'dark' ? 'border-[#ff3b30] bg-[#ff3b30]/5' : 'border-[#f2f2f2] hover:border-[#e5e5e7]'
                      }`}
                    >
                      <div className="w-16 h-12 rounded-lg bg-[#1d1d1f] border border-white/10 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-gray-400">dark_mode</span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${mounted && theme === 'dark' ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>Midnight Dark</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[28px] border border-[#e5e5e7] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f2f2f2]">
                  <h2 className="text-lg font-bold text-[#1d1d1f]">Extraction Filters</h2>
                  <p className="text-xs text-[#86868b] mt-0.5">Filter out irrelevant signals automatically.</p>
                </div>
                <div className="p-8 space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Negative Keywords</h4>
                    <div className="flex gap-3 max-w-lg">
                      <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl focus:ring-2 focus:ring-[#ff3b30]/20 focus:border-[#ff3b30] text-sm font-medium outline-none transition-all"
                        placeholder="e.g., hiring, student, test"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <button onClick={addKeyword} className="px-6 py-3 bg-white border border-[#e5e5e7] text-xs font-bold text-[#1d1d1f] rounded-xl hover:bg-[#f5f5f7] transition-all shadow-sm">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {negativeKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[11px] font-bold border border-[#e5e5e7] shadow-sm">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="text-gray-400 hover:text-[#ff3b30] transition-colors">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-8 py-4 bg-[#fbfbfd] border-t border-[#f2f2f2] flex justify-end">
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#1d1d1f] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-right-8 z-50 flex items-center gap-3 ${
          toast.type === 'error' ? 'bg-[#ff3b30] text-white' : 'bg-[#1d1d1f] text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          showToast('Request submitted', 'success');
        }}
        title="Delete Intelligence Account"
        message="This will permanently wipe all your saved leads, chat history, and extraction monitors. Proceed with caution."
        confirmText="Wipe Everything"
        type="danger"
      />
    </div>
  );
}
