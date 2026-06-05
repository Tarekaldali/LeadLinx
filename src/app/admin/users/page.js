'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import ConfirmationModal from '@/components/ConfirmationModal';
import ExportButtons from '@/components/ExportButtons';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showConfirmBan, setShowConfirmBan] = useState(null);
  const [editFormData, setEditFormData] = useState({ plan: 'free', credits: 400 });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [creditFilter, setCreditFilter] = useState('all'); // all, zero, low, high

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      plan: user.plan || 'free',
      credits: user.credits || 0
    });
  };

  const handleUpdate = async (userId, updates) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        showToast('User updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmBan = () => {
    handleUpdate(showConfirmBan._id, { banned: !showConfirmBan.banned });
    setShowConfirmBan(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesCredits = true;
    if (creditFilter === 'zero') matchesCredits = (user.credits || 0) === 0;
    if (creditFilter === 'low') matchesCredits = (user.credits || 0) > 0 && (user.credits || 0) < 500;
    if (creditFilter === 'high') matchesCredits = (user.credits || 0) >= 1000;

    return matchesSearch && matchesCredits;
  });

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full"></div>)}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">User Management</h1>
          <p className="text-on-surface-variant font-body">{filteredUsers.length} users found {searchQuery && `for "${searchQuery}"`}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ExportButtons currentData={filteredUsers} currentPageName="Users" />
          <button onClick={fetchUsers} className="btn-ghost flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container/50 p-4 rounded-2xl border border-border-glass">
        <div className="relative w-full md:w-96 group">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant group-focus-within:text-primary transition-colors pointer-events-none">search</span>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-14 w-full bg-surface border-border-glass focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          <span className="text-xs font-data-label text-on-surface-variant mr-2 whitespace-nowrap">FILTER BY CREDITS:</span>
          <button 
            onClick={() => setCreditFilter('all')}
            className={`btn-ghost text-xs py-1.5 px-4 rounded-full border ${creditFilter === 'all' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border-glass'}`}
          >
            All
          </button>
          <button 
            onClick={() => setCreditFilter('zero')}
            className={`btn-ghost text-xs py-1.5 px-4 rounded-full border ${creditFilter === 'zero' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border-glass'}`}
          >
            0 Credits
          </button>
          <button 
            onClick={() => setCreditFilter('low')}
            className={`btn-ghost text-xs py-1.5 px-4 rounded-full border ${creditFilter === 'low' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border-glass'}`}
          >
            &lt; 500
          </button>
          <button 
            onClick={() => setCreditFilter('high')}
            className={`btn-ghost text-xs py-1.5 px-4 rounded-full border ${creditFilter === 'high' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border-glass'}`}
          >
            1,000+
          </button>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-xs font-bold text-primary uppercase">
                        {(user.name || user.email || 'A').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface text-sm">{user.name || 'Anonymous'}</div>
                        <div className="text-xs text-on-surface-variant">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.plan === 'enterprise' ? 'badge-enterprise' : user.plan === 'pro' ? 'badge-growth' : user.plan === 'plus' ? 'badge-growth' : 'badge-starter'}`}>
                      {user.plan || 'free'}
                    </span>
                  </td>
                  <td className="font-data-value">{user.credits?.toLocaleString() || 0}</td>
                  <td>
                    {user.banned ? (
                      <span className="badge badge-error">Suspended</span>
                    ) : (
                      <span className="badge badge-growth">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(user)} className="btn-ghost text-xs py-1 px-2">Edit</button>
                      <button onClick={() => setShowConfirmBan(user)} className={`btn-ghost text-xs py-1 px-2 ${user.banned ? 'text-lime-green' : 'text-hot-pink'}`}>
                        {user.banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl opacity-20">search_off</span>
                      <p>No users found matching your criteria</p>
                      <button 
                        onClick={() => { setSearchQuery(''); setCreditFilter('all'); }}
                        className="text-primary text-sm font-bold hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        title={`Edit User: ${editingUser?.email}`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-data-label text-on-surface-variant">QUICK ASSIGN PLAN</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEditFormData({ plan: 'free', credits: 400 })} className="btn-ghost text-xs border border-border-glass">Free (400)</button>
              <button type="button" onClick={() => setEditFormData({ plan: 'plus', credits: 1000 })} className="btn-ghost text-xs border border-border-glass">Plus (1000)</button>
              <button type="button" onClick={() => setEditFormData({ plan: 'pro', credits: 2000 })} className="btn-ghost text-xs border border-border-glass">Pro (2000)</button>
              <button type="button" onClick={() => setEditFormData({ plan: 'enterprise', credits: 5000 })} className="btn-ghost text-xs border border-border-glass">Enterprise (5000)</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-data-label text-on-surface-variant">PLAN</label>
              <select 
                value={editFormData.plan} 
                onChange={e => setEditFormData({...editFormData, plan: e.target.value})}
                className="input-field w-full"
              >
                <option value="free">Free</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-data-label text-on-surface-variant">CREDITS</label>
              <input
                type="number"
                value={editFormData.credits}
                onChange={e => setEditFormData({...editFormData, credits: parseInt(e.target.value)})}
                className="input-field w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setEditingUser(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={() => handleUpdate(editingUser._id, editFormData)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal 
        isOpen={!!showConfirmBan}
        onClose={() => setShowConfirmBan(null)}
        onConfirm={confirmBan}
        title={showConfirmBan?.banned ? 'Unban User' : 'Ban User'}
        message={`Are you sure you want to ${showConfirmBan?.banned ? 'unban' : 'ban'} ${showConfirmBan?.email}?`}
        confirmText={showConfirmBan?.banned ? 'Unban' : 'Ban'}
        type={showConfirmBan?.banned ? 'success' : 'danger'}
      />

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
