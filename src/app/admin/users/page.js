'use client';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

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

  const updateUser = async (userId, updates) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch {
      alert('Failed to update user');
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full"></div>)}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">User Management</h1>
          <p className="text-on-surface-variant font-body">{users.length} total registered users</p>
        </div>
        <button onClick={fetchUsers} className="btn-ghost flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </header>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Credits</th>
                <th>Searches</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-xs font-bold text-primary uppercase">
                        {user.name?.substring(0, 2) || user.email?.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface text-sm">{user.name || 'No name'}</div>
                        <div className="text-xs text-on-surface-variant">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.plan === 'enterprise' ? 'badge-enterprise' : user.plan === 'growth' ? 'badge-growth' : 'badge-starter'}`}>
                      {user.plan || 'starter'}
                    </span>
                  </td>
                  <td>
                    <span className="font-data-value">{user.credits?.toLocaleString() || 0}</span>
                  </td>
                  <td>
                    <span className="font-data-value text-on-surface-variant">{user.searchCount || 0}</span>
                  </td>
                  <td>
                    {user.banned ? (
                      <span className="flex items-center gap-1.5 text-xs text-hot-pink font-data-label">
                        <span className="w-2 h-2 rounded-full bg-hot-pink"></span>
                        Suspended
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-lime-green font-data-label">
                        <span className="w-2 h-2 rounded-full bg-lime-green"></span>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-on-surface-variant font-data-label">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(editingUser === user._id ? null : user._id)}
                        className="btn-ghost text-xs py-1 px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => updateUser(user._id, { banned: !user.banned })}
                        className={`text-xs py-1 px-2 rounded-lg border transition-colors cursor-pointer ${
                          user.banned 
                            ? 'border-lime-green/30 text-lime-green hover:bg-lime-green/5' 
                            : 'border-hot-pink/30 text-hot-pink hover:bg-red-50'
                        }`}
                      >
                        {user.banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-on-surface-variant">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (() => {
        const user = users.find(u => u._id === editingUser);
        if (!user) return null;
        return (
          <div className="modal-overlay" onClick={() => setEditingUser(null)}>
            <div className="bento-card p-8 w-full max-w-md space-y-6 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-xl text-on-surface">Edit User: {user.email}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-data-label text-on-surface-variant">CREDITS</label>
                  <input
                    type="number"
                    defaultValue={user.credits}
                    className="input-field"
                    id="edit-credits"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-data-label text-on-surface-variant">PLAN</label>
                  <select defaultValue={user.plan} className="input-field" id="edit-plan">
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditingUser(null)} className="btn-ghost">Cancel</button>
                <button
                  onClick={() => {
                    const credits = parseInt(document.getElementById('edit-credits').value);
                    const plan = document.getElementById('edit-plan').value;
                    updateUser(user._id, { credits, plan });
                  }}
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
