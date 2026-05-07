'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function SavedLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSaved = async () => {
    try {
      const res = await fetch('/api/leads/saved');
      const data = await res.json();
      if (res.ok) setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSaved(); }, []);

  const confirmRemove = async () => {
    const postId = showConfirmDelete;
    try {
      const res = await fetch(`/api/leads/saved?postId=${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.postId !== postId));
        showToast('Lead removed from saved list');
      } else {
        throw new Error('Failed to remove lead');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-48 skeleton mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-64 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-2xl">stars</span>
            <h1 className="text-4xl font-black text-on-surface tracking-tight">Saved Leads</h1>
          </div>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Your high-intent bookmarked prospects. 
            <span className="font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 ml-1">{leads.length} leads</span>
          </p>
        </div>
        
        {leads.length > 0 && (
          <Link href="/dashboard" className="btn-ghost flex items-center gap-2 px-6">
            <span className="material-symbols-outlined text-sm">search</span>
            Find More Leads
          </Link>
        )}
      </header>

      {leads.length === 0 ? (
        <div className="bento-card p-20 text-center flex flex-col items-center border-dashed border-2">
          <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">bookmark_add</span>
          </div>
          <h3 className="font-headline text-2xl text-on-surface mb-3">Your list is empty</h3>
          <p className="text-on-surface-variant text-base mb-10 max-w-sm mx-auto">
            Find potential customers by searching relevant subreddits. Save the best ones to follow up later.
          </p>
          <Link href="/dashboard" className="btn-primary flex items-center gap-2">
            <span className="material-symbols-outlined">explore</span>
            Start Prospecting
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {leads.map((lead) => (
            <div key={lead._id} className="bento-card group flex flex-col bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {/* Card Header */}
              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-data-label text-secondary truncate">r/{lead.subreddit}</div>
                      <div className="text-xs text-on-surface-variant truncate">u/{lead.author}</div>
                    </div>
                  </div>
                  
                  {lead.intentScore && (
                    <div className={`flex flex-col items-end shrink-0`}>
                      <span className={`px-2.5 py-1 rounded-full font-data-value text-xs ${lead.intentScore >= 8 ? 'intent-hot' : 'intent-warm'}`}>
                        {lead.intentScore}/10 SCORE
                      </span>
                      <span className="text-[10px] text-on-surface-variant mt-1 font-data-label">INTENT</span>
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg text-on-surface leading-tight group-hover:text-primary transition-colors">
                  {lead.title}
                </h3>
                
                {lead.text && (
                  <div className="relative">
                    <div className="absolute -left-2 top-0 text-primary/20 text-4xl font-serif">“</div>
                    <p className="text-sm text-on-surface-variant italic leading-relaxed pl-3 line-clamp-3">
                      {lead.text.length > 250 ? lead.text.substring(0, 250) + '...' : lead.text}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {lead.intentReason && (
                    <span className="px-2 py-1 rounded-md bg-primary/5 text-[10px] font-semibold text-primary uppercase tracking-wider border border-primary/10">
                      {lead.intentReason}
                    </span>
                  )}
                  {lead.urgency && (
                    <span className="px-2 py-1 rounded-md bg-tertiary/10 text-[10px] font-semibold text-tertiary uppercase tracking-wider border border-tertiary/10">
                      Urgency: {lead.urgency}
                    </span>
                  )}
                  {lead.userType && (
                    <span className="px-2 py-1 rounded-md bg-secondary/10 text-[10px] font-semibold text-secondary uppercase tracking-wider border border-secondary/10">
                      Type: {lead.userType}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-border-glass">
                <span className="text-[10px] font-data-label text-on-surface-variant uppercase">
                  Saved {new Date(lead.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowConfirmDelete(lead.postId)} 
                    className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                  <a 
                    href={lead.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant hover:border-primary hover:text-primary rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    View Post
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        onConfirm={confirmRemove}
        title="Remove Lead"
        message="Are you sure you want to remove this lead from your saved list?"
        confirmText="Remove"
        type="danger"
      />

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
