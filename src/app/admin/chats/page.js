'use client';
import { useState, useEffect } from 'react';

export default function AdminChatsPage() {
  const [data, setData] = useState({ chats: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({
      days,
      page: page.toString(),
      limit: '15',
      search
    });

    fetch(`/api/admin/chats?${qs.toString()}`)
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d);
      })
      .finally(() => setLoading(false));
  }, [days, page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-on-surface">Chat History</h1>
          <p className="text-on-surface-variant mt-1 font-body">Complete chat logs, messages, and user session data.</p>
        </div>
        <select
          value={days}
          onChange={e => { setDays(e.target.value); setPage(1); }}
          className="input-field py-2 px-3 w-40 text-sm"
        >
          <option value="1">Last 1 day</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="bento-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border-glass flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">forum</span>
            <h2 className="font-headline text-base text-on-surface">User Chat Sessions</h2>
            <span className="text-xs text-on-surface-variant ml-2">(Total: {data.total})</span>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search email, chat ID..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field py-1.5 px-3 text-sm w-64"
            />
            <button type="submit" className="action-btn py-1.5 px-3 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">search</span>
            </button>
          </form>
        </div>

        <div className="overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">Chat ID</th>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">User Email</th>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">Title</th>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">Messages</th>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">Last Updated</th>
                <th className="text-left px-4 py-3 font-data-label text-on-surface-variant text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {data.chats.map((chat) => (
                <tr key={chat._id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3 font-data-value text-on-surface-variant text-xs">{chat._id.substring(0, 12)}…</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{chat.user?.email || chat.userId?.substring(0, 8) + '...'}</td>
                  <td className="px-4 py-3 text-on-surface truncate max-w-xs">{chat.title || 'Untitled'}</td>
                  <td className="px-4 py-3 font-data-value">{chat.messageCount}</td>
                  <td className="px-4 py-3 font-data-value text-xs text-on-surface-variant">{new Date(chat.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => setSelectedChat(chat)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
              {data.chats.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    No chats found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border-glass flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">Page {page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border-glass text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 rounded-lg border border-border-glass text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedChat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm" onClick={() => setSelectedChat(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b border-border-glass flex justify-between items-start">
              <div>
                <h3 className="text-xl font-headline text-on-surface">Chat Transcript: {selectedChat.title}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  User: {selectedChat.user?.email || selectedChat.userId} • ID: {selectedChat._id}
                </p>
              </div>
              <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {(!selectedChat.messages || selectedChat.messages.length === 0) ? (
                <div className="text-center text-on-surface-variant py-10">No messages in this chat.</div>
              ) : (
                selectedChat.messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 px-1">
                      {m.role}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface border border-border-glass'}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed font-body">{m.content}</p>
                      {m.leads && m.leads.length > 0 && (
                        <div className="mt-3 text-xs bg-black/10 dark:bg-black/20 p-2 rounded-lg font-mono">
                          Generated {m.leads.length} leads
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
