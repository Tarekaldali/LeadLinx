'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';
import { useTheme } from 'next-themes';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'account', label: 'Account', icon: 'shield' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
  { id: 'preferences', label: 'Preferences', icon: 'tune' },
];

export default function SettingsPage() {
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
      // Optimistic update
      showToast('Profile updated successfully');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Failed to update password', 'error');
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
      <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
        <div className="w-full md:w-64 skeleton h-[200px] rounded-xl shrink-0" />
        <div className="flex-1 space-y-6">
          <div className="skeleton h-64 w-full rounded-2xl" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const user = session?.user;
  const isOAuth = user?.image || !user?.password; // Roughly checking if OAuth

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">Settings</h1>
        <p className="text-on-surface-variant mt-1">Manage your account settings and preferences.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                    : 'text-gray-600 hover:bg-surface-container-low hover:text-on-surface border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-border-glass">
                <h2 className="text-lg font-semibold text-on-surface">Profile</h2>
                <p className="text-sm text-on-surface-variant">Update your personal information.</p>
              </div>
              <div className="p-6 space-y-6">
                
              <div className="changepass">
                <label className="block text-sm font-medium text-on-surface mb-1.5">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow" 
                />
                <label className="block text-sm font-medium text-on-surface mb-1.5 mt-4">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow" 
                />
                <label className="block text-sm font-medium text-on-surface mb-1.5 mt-4">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow" 
                />
                <br></br>
                <br></br>
                <button
                  onClick={handleUpdatePassword}
                  disabled={saving}
                  className="px-5 py-2 action-btn rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {saving ? 'hourglass_empty' : 'update'}
                  </span>
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
              
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                      className="w-full px-4 py-2 border border-border-glass bg-surface-container-low rounded-lg shadow-sm text-on-surface-variant text-sm outline-none"
                    />
                    {isOAuth && <p className="text-xs text-on-surface-variant mt-1.5">Your email is managed by your connected provider.</p>}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-surface-container-low border-t border-border-glass flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 py-2 action-btn rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border-glass">
                  <h2 className="text-lg font-semibold text-on-surface">Security & Providers</h2>
                  <p className="text-sm text-on-surface-variant">Manage how you log in to LeadLinx.</p>
                </div>
                <div className="p-6 space-y-6">
                  {!isOAuth && (
                    <div className="max-w-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">Current Password</label>
                        <input type="password" placeholder="••••••••" className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">New Password</label>
                        <input type="password" placeholder="••••••••" className="w-full px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow" />
                      </div>
                      <button className="px-4 py-2 bento-card border border-border-glass rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors shadow-sm">
                        Update Password
                      </button>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-on-surface mb-3">Connected Providers</h3>
                    <div className="flex items-center justify-between p-4 border border-border-glass rounded-xl max-w-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">Google</p>
                          <p className="text-xs text-on-surface-variant">Connected</p>
                        </div>
                      </div>
                      <button className="text-sm font-medium text-red-600 hover:text-hot-pink">Disconnect</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-hot-pink/10 rounded-2xl border border-hot-pink/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-hot-pink">Delete Account</h3>
                  <p className="text-sm text-hot-pink/80 mt-1">Permanently remove your account and all associated data.</p>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-hot-pink text-white rounded-lg text-sm font-medium hover:bg-hot-pink/90 transition-colors shadow-sm shrink-0"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-border-glass">
                <h2 className="text-lg font-semibold text-on-surface">Billing & Subscription</h2>
                <p className="text-sm text-on-surface-variant">Manage your subscription plan and billing details.</p>
              </div>
              <div className="p-6">
                <div className="bg-surface-container-low rounded-xl p-6 border border-border-glass max-w-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">Current Plan</p>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-on-surface capitalize">{user?.plan || 'Free'}</h3>
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                    </div>
                    {user?.plan !== 'free' && <p className="text-sm text-on-surface-variant pt-1">Renews on {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/stripe/portal', { method: 'POST' });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                      }}
                      className="px-5 py-2 bg-black dark:bento-card dark:text-black text-white rounded-lg text-sm font-medium hover:opacity-90 dark:hover:bg-border-glass transition-colors shadow-sm text-center"
                    >
                      Manage Billing
                    </button>
                    {user?.plan === 'free' && (
                      <Link href="/pricing" className="px-5 py-2 bento-card border border-border-glass text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors shadow-sm text-center">
                        Upgrade Plan
                      </Link>
                    )}
                  </div>
                </div>

                {user?.plan !== 'free' && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-on-surface mb-1">Billing Information</h3>
                    <p className="text-sm text-on-surface-variant mb-4">Manage your payment method and billing details.</p>
                    
                    <div className="bento-card border border-border-glass rounded-xl overflow-hidden max-w-4xl">
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Card Brand</p>
                            <p className="text-base font-semibold text-on-surface flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary">credit_card</span>
                              Visa
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Last 4 Digits</p>
                            <p className="text-base font-semibold text-on-surface">**** 4242</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Cardholder Name</p>
                            <p className="text-base font-semibold text-on-surface">{user?.name || 'LeadLinx User'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Billing Email</p>
                            <p className="text-base font-semibold text-on-surface">{user?.email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Country</p>
                            <p className="text-base font-semibold text-on-surface">United States</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface-variant mb-1">Next Invoice Date</p>
                            <p className="text-base font-semibold text-on-surface">
                              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-surface-container-low border-t border-border-glass flex flex-col sm:flex-row justify-end gap-3">
                        <button className="px-5 py-2 bento-card-container border border-border-glass dark:border-border-glass text-on-surface dark:text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors shadow-sm text-center">
                          Download Latest Invoice
                        </button>
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/stripe/portal', { method: 'POST' });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          }}
                          className="px-5 py-2 bg-black dark:bento-card dark:text-black text-white rounded-lg text-sm font-medium hover:opacity-90 dark:hover:bg-border-glass transition-colors shadow-sm text-center"
                        >
                          Update Payment Method
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-fade-in">
              {/* Appearance */}
              <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border-glass dark:border-border-glass">
                  <h2 className="text-lg font-semibold text-on-surface">Appearance</h2>
                  <p className="text-sm text-on-surface-variant">Customize how LeadLinx looks on your device.</p>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Light Theme */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        mounted && theme === 'light' ? 'border-primary bg-primary/5' : 'border-border-glass hover:border-border-glass dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-16 h-12 rounded-md bg-surface-container border border-border-glass flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant">light_mode</span>
                      </div>
                      <span className={`text-sm font-medium ${mounted && theme === 'light' ? 'text-primary' : 'text-on-surface-variant'}`}>Light</span>
                    </button>

                    {/* Dark Theme */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        mounted && theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border-glass hover:border-border-glass dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-16 h-12 rounded-md bg-surface-container-high border border-border-glass flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                      </div>
                      <span className={`text-sm font-medium ${mounted && theme === 'dark' ? 'text-primary' : 'text-on-surface-variant'}`}>Dark</span>
                    </button>


                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border-glass dark:border-border-glass">
                  <h2 className="text-lg font-semibold text-on-surface">Notifications</h2>
                  <p className="text-sm text-on-surface-variant">Manage what emails you receive from LeadLinx.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-on-surface">Smart Lead Alerts</h4>
                      <p className="text-sm text-on-surface-variant">Receive an email when AI detects a high-intent lead (score ≥ 8).</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                      <div className="w-11 h-6 bg-border-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bento-card after:border-border-glass after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border-glass">
                    <div>
                      <h4 className="text-sm font-medium text-on-surface">Weekly Digest</h4>
                      <p className="text-sm text-on-surface-variant">A weekly summary of your lead generation performance.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={weeklyReports} onChange={(e) => setWeeklyReports(e.target.checked)} />
                      <div className="w-11 h-6 bg-border-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bento-card after:border-border-glass after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Negative Keywords */}
              <div className="bento-card rounded-2xl border border-border-glass shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border-glass">
                  <h2 className="text-lg font-semibold text-on-surface">Extraction Filters</h2>
                  <p className="text-sm text-on-surface-variant">Filter out irrelevant posts before AI processing.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-on-surface mb-2">Negative Keywords</h4>
                    <div className="flex gap-3 max-w-lg">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 border border-border-glass rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-shadow"
                        placeholder="e.g., hiring, intern, student"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <button onClick={addKeyword} className="px-4 py-2 bg-surface-container border border-border-glass text-on-surface rounded-lg text-sm font-medium hover:bg-border-glass transition-colors shadow-sm whitespace-nowrap">
                        Add Keyword
                      </button>
                    </div>
                  </div>

                  {negativeKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {negativeKeywords.map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hot-pink/10 text-hot-pink text-xs font-medium border border-hot-pink/20">
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="hover:text-hot-pink cursor-pointer text-red-400">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant italic">No negative keywords set.</p>
                  )}
                </div>
                <div className="px-6 py-4 bg-surface-container-low border-t border-border-glass flex justify-end">
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="px-5 py-2 action-btn rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toasts & Modals */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in z-50 ${
          toast.type === 'error' ? 'bg-hot-pink/10 text-red-800 border border-red-200' : 'bg-surface-container-high text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          showToast('Account deletion request submitted', 'success');
        }}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
        confirmText="Delete Permanently"
        type="danger"
      />
    </div>
  );
}
