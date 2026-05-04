'use client';
import { useState } from 'react';

const BADGE_CONFIG = {
  hot:         { icon: '🔥', label: 'High Intent',  cls: 'intent-hot' },
  opportunity: { icon: '⚡', label: 'Opportunity',  cls: 'intent-warm' },
  discussion:  { icon: '💬', label: 'Discussion',   cls: 'intent-cold' },
};

export default function ChatMessage({ message, onSave, onExport, onSuggestionClick }) {
  const [replyModal, setReplyModal] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyTab, setReplyTab] = useState('helpful');
  const [replyLoading, setReplyLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };
  const copy = (text) => { navigator.clipboard.writeText(text); showToast('Copied!'); };

  const openReply = async (lead) => {
    setReplyModal(lead);
    setReplyLoading(true);
    setReplyTab('helpful');
    setReplies({});
    try {
      const res = await fetch('/api/leads/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: lead.title, text: lead.text }),
      });
      const data = await res.json();
      if (res.ok) setReplies(data.replies || {});
      else setReplies({ helpful: data.error || 'Failed' });
    } catch { setReplies({ helpful: 'Network error' }); }
    finally { setReplyLoading(false); }
  };

  // User message bubble
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-lg bg-primary text-white rounded-2xl rounded-br-sm px-5 py-3 text-sm font-body">
          {message.content}
        </div>
      </div>
    );
  }

  // AI response bubble
  const { leads = [], insights, selectedSubreddits = [], expandedQueries = [], totalScanned, suggestedQueries = [], error, planLimit } = message;

  return (
    <div className="flex gap-3 items-start">
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full gradient-purple flex items-center justify-center shrink-0 mt-1">
        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
      </div>

      <div className="flex-1 space-y-4 min-w-0">
        {/* Error state */}
        {error && (
          <div className="bento-card px-4 py-3 border-error/20 text-error text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>{error}
          </div>
        )}

        {/* Subreddits + stats */}
        {selectedSubreddits.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-on-surface-variant font-data-label">AI SEARCHED:</span>
            {selectedSubreddits.map(s => (
              <span key={s} className="px-2 py-1 rounded-md bg-primary-container/50 text-primary font-medium">r/{s}</span>
            ))}
            {totalScanned > 0 && <span className="text-on-surface-variant ml-1">{totalScanned} posts scanned</span>}
          </div>
        )}

        {/* No results */}
        {!error && leads.length === 0 && (
          <div className="bento-card p-5 text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-tertiary block">search_off</span>
            <p className="text-sm text-on-surface-variant">No strong leads found. Try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedQueries.map(q => (
                <button key={q} onClick={() => onSuggestionClick(q)}
                  className="chip-suggestion text-xs">{q}</button>
              ))}
            </div>
          </div>
        )}

        {/* Lead cards */}
        {leads.length > 0 && (
          <div className="space-y-3">
            {/* Plan limit notice */}
            {planLimit && leads.length >= planLimit && (
              <div className="text-xs text-on-surface-variant px-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary">info</span>
                Showing {leads.length} leads (your plan limit).
                <a href="/pricing" className="text-primary hover:underline ml-1">Upgrade for more →</a>
              </div>
            )}

            {/* Export button */}
            <div className="flex justify-end">
              <button onClick={() => onExport(leads)}
                className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">download</span>
                Export CSV ({leads.length})
              </button>
            </div>

            {leads.map((lead, i) => {
              const badge = BADGE_CONFIG[lead.badge] || BADGE_CONFIG.discussion;
              return (
                <div key={lead.id || i} className={`bento-card p-4 transition-all hover:border-primary/20 ${i === 0 ? 'ring-1 ring-primary/20' : ''}`}>
                  {i === 0 && (
                    <div className="flex items-center gap-1 text-xs font-data-label text-primary mb-2">
                      <span className="material-symbols-outlined text-[12px]">star</span>BEST MATCH
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">{lead.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant font-data-label">
                        <span className="text-secondary font-bold">r/{lead.subreddit}</span>
                        <span>·</span><span>u/{lead.author}</span>
                        {lead.score > 0 && <><span>·</span><span>↑{lead.score}</span></>}
                        {lead.numComments > 0 && <><span>·</span><span>💬{lead.numComments}</span></>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                          {badge.icon} {badge.label}
                        </span>
                        {lead.urgency && lead.urgency !== 'low' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                            {lead.urgency === 'critical' ? '🚨' : '⏰'} {lead.urgency}
                          </span>
                        )}
                        {lead.userType && lead.userType !== 'other' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-container text-on-primary-container">
                            {lead.userType}
                          </span>
                        )}
                      </div>
                      {lead.painPoint && <p className="text-xs text-on-surface-variant italic line-clamp-1">"{lead.painPoint}"</p>}
                      {lead.intentReason && <p className="text-xs text-primary">{lead.intentReason}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-data-value text-center ${lead.intentScore >= 8 ? 'intent-hot' : lead.intentScore >= 5 ? 'intent-warm' : 'intent-cold'}`}>
                        {lead.intentScore}/10
                      </span>
                      <a href={lead.link} target="_blank" rel="noreferrer"
                        className="btn-primary text-xs py-1.5 px-3 text-center flex items-center gap-1 justify-center whitespace-nowrap">
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>View
                      </a>
                      <button onClick={() => openReply(lead)}
                        className="btn-teal text-xs py-1.5 px-3 flex items-center gap-1 justify-center whitespace-nowrap">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>Reply
                      </button>
                      <button onClick={() => onSave(lead)}
                        className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 justify-center">
                        <span className="material-symbols-outlined text-[12px]">bookmark_add</span>Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Insights */}
        {insights && (
          <div className="bento-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <span className="material-symbols-outlined text-tertiary text-sm">insights</span>
              Market Insights
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {insights.topPainPoints?.length > 0 && (
                <div>
                  <div className="font-data-label text-on-surface-variant mb-1.5">PAIN POINTS</div>
                  <ul className="space-y-1">{insights.topPainPoints.map((p, i) => <li key={i} className="text-on-surface">• {p}</li>)}</ul>
                </div>
              )}
              {insights.trendingComplaints?.length > 0 && (
                <div>
                  <div className="font-data-label text-on-surface-variant mb-1.5">COMPLAINTS</div>
                  <ul className="space-y-1">{insights.trendingComplaints.map((c, i) => <li key={i} className="text-on-surface">• {c}</li>)}</ul>
                </div>
              )}
              {insights.saasIdeas?.length > 0 && (
                <div>
                  <div className="font-data-label text-on-surface-variant mb-1.5">SAAS IDEAS</div>
                  <ul className="space-y-1">{insights.saasIdeas.map((s, i) => <li key={i} className="text-on-surface">💡 {s}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setReplyModal(null)}>
          <div className="bento-card p-6 w-full max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>AI Reply Generator
              </h3>
              <button onClick={() => setReplyModal(null)}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="text-xs font-data-label text-on-surface-variant mb-1">REPLYING TO</div>
            <div className="text-sm font-medium text-on-surface mb-4 line-clamp-2">{replyModal.title}</div>
            {replyLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-on-surface-variant text-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Generating 3 reply variants...
              </div>
            ) : (
              <>
                <div className="flex gap-1 p-1 bg-surface-container-low rounded-lg mb-4">
                  {[['helpful','💚 Helpful'],['authority','🧠 Authority'],['conversion','🎯 Conversion']].map(([key, label]) => (
                    <button key={key} onClick={() => setReplyTab(key)}
                      className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${replyTab === key ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input-field min-h-[140px] resize-y text-sm"
                  value={replies[replyTab] || ''}
                  onChange={e => setReplies(p => ({ ...p, [replyTab]: e.target.value }))}
                />
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setReplyModal(null)} className="btn-ghost text-sm">Cancel</button>
                  <button onClick={() => copy(replies[replyTab] || '')} className="btn-primary text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span>Copy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>{toast.msg}</div>}
    </div>
  );
}
