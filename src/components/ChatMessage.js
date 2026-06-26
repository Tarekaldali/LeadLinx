'use client';
import { useState, useEffect, useRef } from 'react';

const TYPE_CONFIG = {
  'Pain-Point': { icon: '🚨', label: 'Pain-Point' },
  'Competitor-Frustration': { icon: '⚔️', label: 'Competitor' },
  'Solution-Seeking': { icon: '🔍', label: 'Seeking Solution' },
};

// Strip all HTML tags from a string
function stripHtml(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[a-zA-Z\/][^>]*(?:>|$)/g, '')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ChatMessage({ message, onSave, onExport, onSuggestionClick, onUpdate }) {
  const [toast, setToast] = useState(null);
  const [savedLeads, setSavedLeads] = useState(new Set());
  // minScore comes from the message (set at search time in the input area)
  const minScore = message.minScore ?? 6;

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };
  const copy = (text) => { navigator.clipboard.writeText(text); showToast('Copied!'); };

  const handleSave = async (lead) => {
    if (savedLeads.has(lead.id)) return;
    const success = await onSave?.(lead);
    if (success) {
      setSavedLeads(prev => new Set([...prev, lead.id]));
    }
  };

  const { leads = [], insights, selectedSubreddits = [], searchQueries = [], totalScanned, error, status, searchId } = message;
  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';

  // Poll for results when processing in the background
  const pollRef = useRef(null);
  useEffect(() => {
    if (!isProcessing || !searchId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/leads/search/${searchId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollRef.current);
          onUpdate?.({
            status: data.status,
            leads: data.leads || [],
            insights: data.insights || null,
            totalScanned: data.totalScanned || 0,
            selectedSubreddits: data.selectedSubreddits || [],
            searchQueries: data.searchQueries || [],
            error: data.error || null,
            progress: data.progress || null,
          });
        }
      } catch { /* fail silently */ }
    };

    pollRef.current = setInterval(poll, 5000);
    // Also poll immediately
    poll();
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, searchId]);

  // Fix React Error #31: DeepSeek occasionally returns objects instead of strings
  const safeQueries = searchQueries.flatMap(q => {
    if (typeof q === 'string') return [q];
    if (typeof q === 'object' && q !== null) return q.search_query || q.query || JSON.stringify(q);
    return [];
  });

  const safeSubreddits = selectedSubreddits.flatMap(s => {
    if (typeof s === 'string') return [s];
    if (typeof s === 'object' && s !== null) {
      if (Array.isArray(s.subreddits)) return s.subreddits;
      return s.name || s.subreddit || JSON.stringify(s);
    }
    return [];
  });

  return (
    <div className="space-y-8">
      {/* Search Progress & Strategy Context */}
      {(safeSubreddits.length > 0 || safeQueries.length > 0 || isProcessing) && (
        <div className="p-6 bg-surface-dim rounded-[24px] border border-outline-variant space-y-4 animate-in fade-in relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProcessing ? (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full animate-pulse [animation-delay:0.2s]" />
                </div>
              ) : (
                <span className="material-symbols-outlined text-[#ff3b30] text-[18px]">hub</span>
              )}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isProcessing ? 'text-[#ff3b30]' : 'text-on-surface-variant'}`}>
                {isProcessing ? 'Optimizing Extraction' : 'Extraction Strategy'}
              </span>
            </div>
            {totalScanned > 0 && (
              <span className="text-[10px] text-on-surface font-bold bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant tracking-widest uppercase">
                {totalScanned} SIGNALS ANALYZED
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeQueries.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Logic Filters</span>
                <div className="flex flex-wrap gap-1.5">
                  {safeQueries.map((q, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-surface border border-outline-variant rounded-lg text-[10px] font-medium text-on-surface font-mono shadow-sm">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {safeSubreddits.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Sources</span>
                <div className="flex flex-wrap gap-1.5">
                  {safeSubreddits.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-surface text-on-surface text-[10px] font-bold border border-outline-variant shadow-sm">r/{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email notification note during processing */}
          {isProcessing && (
            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/50">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">mail</span>
              <span className="text-[10px] text-on-surface-variant font-medium">
                We'll notify you by email when extraction finishes — you can safely close this tab.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lead Results */}
      {leads.length > 0 ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          {/* Score filter indicator + header */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#ff3b30] rounded-full" />
              <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">
                Qualified Prospects
                <span className="ml-2 text-on-surface-variant/60 font-medium normal-case tracking-normal">
                  ({leads.filter(l => (l.score || l.intentScore || 0) >= minScore).length} shown)
                </span>
              </h4>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Active filter badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ff3b30]/8 border border-[#ff3b30]/20 rounded-lg">
                <span className="material-symbols-outlined text-[12px] text-[#ff3b30]">verified</span>
                <span className="text-[10px] font-bold text-[#ff3b30]">Score ≥ {minScore}/10</span>
              </div>
              {onExport && (
                <button onClick={() => onExport(leads)} className="text-[10px] font-black text-[#ff3b30] hover:text-[#d72f25] transition-colors flex items-center gap-2 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {leads.filter(lead => (lead.score || lead.intentScore || 0) >= minScore).map((lead, idx) => {
              const type = TYPE_CONFIG[lead.type] || { icon: '🎯', label: lead.type };
              const score = lead.score || lead.intentScore || 0;
              const scoreColor = score >= 8 ? 'text-[#28cd41]' : score >= 6 ? 'text-[#ff3b30]' : 'text-[#ff3b30]';
              
              return (
                <div key={idx} className="bg-surface rounded-[24px] border border-outline-variant p-6 hover:shadow-xl transition-all duration-500 group shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Lead Profile */}
                    <div className="md:w-64 space-y-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-500">
                          {type.icon}
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-[#ff3b30] uppercase tracking-widest mb-0.5">{type.label}</div>
                          <div className="font-bold text-on-surface flex items-center gap-1.5">
                            u/{lead.author}
                            <a href={`https://reddit.com/u/${lead.author}`} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-[#ff3b30] transition-colors">
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant">
                        <div className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between items-center">
                          <span>Intent Score</span>
                          <span className={scoreColor}>{score}/10</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-outline-variant">
                          <div className={`h-full rounded-full ${score >= 8 ? 'bg-[#28cd41]' : score >= 6 ? 'bg-[#ff3b30]' : 'bg-[#ff3b30]'} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-3 py-1 bg-surface-container-low border border-outline-variant rounded-full text-on-surface-variant uppercase tracking-widest">r/{lead.subreddit}</span>
                      </div>

                      <h3 className="font-bold text-lg text-on-surface leading-tight hover:text-[#ff3b30] transition-colors cursor-pointer pr-12">
                        <a href={lead.link} target="_blank" rel="noreferrer">{lead.title}</a>
                      </h3>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {lead.emails?.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-surface-dim border border-outline-variant text-on-surface rounded-xl text-xs font-medium cursor-pointer hover:bg-[#ff3b30]/10 hover:border-[#ff3b30]/20 hover:text-[#ff3b30] transition-all group/badge" onClick={() => copy(e)}>
                            <span className="material-symbols-outlined text-[16px] text-[#ff3b30]">mail</span> {e}
                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover/badge:opacity-100 transition-opacity">content_copy</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row md:flex-col gap-3 shrink-0">
                      <button
                        onClick={() => handleSave(lead)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${savedLeads.has(lead.id)
                            ? 'bg-[#ff3b30] text-white scale-95'
                            : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:bg-surface hover:text-on-surface hover:border-[#ff3b30]'
                          }`}
                        title={savedLeads.has(lead.id) ? "Saved to CRM" : "Save Intelligence"}
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {savedLeads.has(lead.id) ? 'check_circle' : 'bookmark'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {lead.body && (
                    <div className="mt-6 p-5 bg-surface-dim rounded-2xl border border-outline-variant">
                      <div className="flex items-center gap-2 text-[9px] font-black text-[#ff3b30] uppercase mb-3 tracking-[0.2em]">
                        <span className="material-symbols-outlined text-[16px]">neurology</span>
                        Intent Classification Reasoning
                      </div>
                      <p className="text-sm text-on-surface font-medium leading-relaxed italic pr-4">&ldquo;{stripHtml(lead.body)}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        isCompleted && !error && (
          <div className="p-16 bg-surface-dim border border-dashed border-outline-variant rounded-[40px] text-center space-y-6 animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-surface border border-outline-variant rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px]">manage_search</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">Zero High-Intent Signals Found</h3>
              <p className="text-sm text-on-surface-variant max-w-[400px] mx-auto leading-relaxed font-medium">
                LeadLinx scanned signals but none met the elite threshold of intent for this search.
              </p>
            </div>
          </div>
        )
      )}

      {/* Insights Section */}
      {insights && isCompleted && (
        <div className="p-8 bg-surface rounded-[32px] border border-outline-variant space-y-6 animate-in fade-in duration-1000 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ff3b30]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ff3b30] text-[18px]">query_stats</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Strategic Intelligence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {insights.topPainPoints?.length > 0 && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#ff3b30] rounded-full" /> Market Pain Points
                </span>
                <ul className="space-y-3">
                  {insights.topPainPoints.map((p, idx) => (
                    <li key={idx} className="text-sm font-medium text-on-surface flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#ff3b30] text-[16px] mt-0.5">warning</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.saasIdeas?.length > 0 && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#28cd41] rounded-full" /> Opportunity Gaps
                </span>
                <ul className="space-y-3">
                  {insights.saasIdeas.map((s, idx) => (
                    <li key={idx} className="text-sm font-medium text-on-surface flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#28cd41] text-[16px] mt-0.5">lightbulb</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-12 right-6 z-[100] px-6 py-3 bg-[#1d1d1f] text-white text-xs font-bold rounded-2xl shadow-2xl animate-in border border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
