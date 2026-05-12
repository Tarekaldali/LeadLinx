'use client';
import { useState } from 'react';

const TYPE_CONFIG = {
  'Pain-Point': { icon: '🚨', label: 'Pain-Point' },
  'Competitor-Frustration': { icon: '⚔️', label: 'Competitor' },
  'Solution-Seeking': { icon: '🔍', label: 'Seeking Solution' },
};

export default function ChatMessage({ message, onSave, onExport, onSuggestionClick }) {
  const [toast, setToast] = useState(null);
  const [savedLeads, setSavedLeads] = useState(new Set());

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };
  const copy = (text) => { navigator.clipboard.writeText(text); showToast('Copied!'); };

  const handleSave = async (lead) => {
    if (savedLeads.has(lead.id)) return;
    const success = await onSave?.(lead);
    if (success) {
      setSavedLeads(prev => new Set([...prev, lead.id]));
    }
  };

  // Assistant data
  const { leads = [], insights, selectedSubreddits = [], searchQueries = [], totalScanned, error, status } = message;
  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';

  return (
    <div className="space-y-6">
      {/* Text Content */}
      {message.content && (status === 'chat' || !status) && (
        <div className="text-message">
          {message.content}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      {/* Search Progress & Strategy Context */}
      {(selectedSubreddits.length > 0 || searchQueries.length > 0 || isProcessing) && (
        <div className="p-4 bg-surface-container-low/50 rounded-2xl border border-border-glass/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isProcessing ? 'text-blue-500' : 'text-on-surface-variant/70'}`}>
                {isProcessing ? 'Architecting Search...' : 'Search Strategy'}
              </span>
            </div>
            {totalScanned > 0 && (
              <span className="text-[10px] text-on-surface-variant font-bold bg-surface px-2 py-0.5 rounded-full border border-border-glass">
                {totalScanned} POSTS SCANNED
              </span>
            )}
          </div>

          <div className="space-y-2">
            {searchQueries.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Boolean Queries</span>
                <div className="flex flex-wrap gap-1">
                  {searchQueries.map((q, idx) => (
                    <span key={idx} className="px-2 py-1 bg-surface border border-border-glass rounded-lg text-[10px] font-medium text-on-surface font-mono">
                      {typeof q === 'string' ? q : JSON.stringify(q)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedSubreddits.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Target Subreddits</span>
                <div className="flex flex-wrap gap-1">
                  {selectedSubreddits.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold">r/{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Results */}
      {leads.length > 0 ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Qualified Prospects</h4>
            {onExport && (
              <button onClick={() => onExport(leads)} className="text-[10px] font-bold text-gray-400 hover:text-black flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">download</span> Export CSV
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {leads.map((lead, i) => {
              const typeInfo = TYPE_CONFIG[lead.leadType] || { icon: '🎯', label: lead.leadType || 'Lead' };
              const score = lead.score || lead.intentScore || 0; // fallback
              const isHot = score >= 80 || (score <= 10 && score >= 8); // handles both 0-100 and 0-10 formats
              const displayScore = score > 10 ? score : score * 10;

              return (
                <div key={lead.id || i} className="p-5 border border-border-glass rounded-2xl hover:border-primary/50 transition-all bg-surface group hover:shadow-md relative overflow-hidden">
                  {/* Decorative gradient for hot leads */}
                  {isHot && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-emerald-600" />}

                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-container-highest rounded-md text-on-surface-variant uppercase tracking-wider">{lead.subreddit}</span>
                        <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          {lead.author} {lead.company ? `· ${lead.company}` : ''}
                        </span>

                        <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm ${isHot ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                          <span className="material-symbols-outlined text-[12px]">{isHot ? 'local_fire_department' : 'analytics'}</span>
                          {displayScore}/100 INTENT
                        </span>
                      </div>

                      <h3 className="font-bold text-[15px] text-on-surface leading-snug hover:text-primary transition-colors cursor-pointer">
                        <a href={lead.link} target="_blank" rel="noreferrer">{lead.title}</a>
                      </h3>

                      {/* Contact Info Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lead.emails?.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-border-glass text-on-surface-variant rounded-md text-[11px] font-medium cursor-pointer hover:bg-surface-container-highest transition-colors" onClick={() => copy(e)}>
                            <span className="material-symbols-outlined text-[14px] text-primary">mail</span> {e}
                          </div>
                        ))}
                        {lead.phones?.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-border-glass text-on-surface-variant rounded-md text-[11px] font-medium cursor-pointer hover:bg-surface-container-highest transition-colors" onClick={() => copy(p)}>
                            <span className="material-symbols-outlined text-[14px] text-secondary">call</span> {p}
                          </div>
                        ))}
                        {lead.socials?.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-border-glass text-on-surface-variant rounded-md text-[11px] font-medium cursor-pointer hover:bg-surface-container-highest transition-colors" onClick={() => copy(s)}>
                            <span className="material-symbols-outlined text-[14px] text-tertiary">alternate_email</span> {s}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleSave(lead)}
                        disabled={savedLeads.has(lead.id)}
                        className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors shadow-sm ${savedLeads.has(lead.id)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-surface border-border-glass text-on-surface-variant hover:bg-surface-container hover:text-primary group-hover:border-border-glass'
                          }`}
                        title={savedLeads.has(lead.id) ? "Saved" : "Save Lead"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {savedLeads.has(lead.id) ? 'bookmark_added' : 'bookmark'}
                        </span>
                      </button>
                      <a href={lead.link} target="_blank" rel="noreferrer" className="w-10 h-10 bg-on-surface text-surface rounded-xl flex items-center justify-center hover:bg-primary transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                      </a>
                    </div>
                  </div>

                  {lead.body && (
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-glass mb-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase mb-1.5 tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                        AI Qualification Reasoning
                      </div>
                      <p className="text-[13px] text-on-surface-variant font-medium leading-relaxed">{lead.body}</p>
                    </div>
                  )}

                  {lead.suggestedReply && (
                    <div className="relative p-3.5 border border-dashed border-border-glass rounded-xl hover:border-primary hover:bg-primary/5 transition-all group/reply cursor-pointer mt-3" onClick={() => copy(lead.suggestedReply)}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 tracking-wider group-hover/reply:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        Suggested Hook (Click to Copy)
                      </div>
                      <p className="text-[13px] text-on-surface-variant/80 italic">"{lead.suggestedReply}"</p>
                      <span className="absolute top-3.5 right-3.5 material-symbols-outlined text-on-surface-variant/30 group-hover/reply:text-primary text-[16px] transition-colors">content_copy</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        isCompleted && !error && (
          <div className="p-10 border border-dashed border-border-glass rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-[32px]">manage_search</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-on-surface">No high-intent leads qualified</h3>
              <p className="text-xs text-on-surface-variant max-w-[320px] mx-auto leading-relaxed">
                I analyzed {totalScanned || 'all'} relevant posts found on Reddit, but none met our strict quality threshold (7/10 intent score).
                Try searching for specific **competitor names** or **direct pain points** to find more active prospects.
              </p>
            </div>
          </div>
        )
      )}

      {/* Insights Section */}
      {insights && isCompleted && (
        <div className="p-6 bg-surface-container-low rounded-2xl border border-border-glass space-y-4 animate-in fade-in duration-1000">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">analytics</span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Market Intelligence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.topPainPoints?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Top Pain Points</span>
                <ul className="space-y-1">
                  {insights.topPainPoints.map((p, idx) => (
                    <li key={idx} className="text-xs font-medium text-on-surface-variant flex items-start gap-2">
                      <span className="text-primary mt-1">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.saasIdeas?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Opportunity Gaps</span>
                <ul className="space-y-1">
                  {insights.saasIdeas.map((s, idx) => (
                    <li key={idx} className="text-xs font-medium text-on-surface-variant flex items-start gap-2">
                      <span className="text-secondary mt-1">💡</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 right-4 z-50 px-4 py-2 bg-black text-white text-xs font-bold rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-4">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
