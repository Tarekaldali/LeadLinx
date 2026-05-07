'use client';
import { useState } from 'react';

const TYPE_CONFIG = {
  'Pain-Point': { icon: '🚨', label: 'Pain-Point' },
  'Competitor-Frustration': { icon: '⚔️', label: 'Competitor' },
  'Solution-Seeking': { icon: '🔍', label: 'Seeking Solution' },
};

export default function ChatMessage({ message, onSave, onExport, onSuggestionClick }) {
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };
  const copy = (text) => { navigator.clipboard.writeText(text); showToast('Copied!'); };

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
        <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isProcessing ? 'text-blue-500' : 'text-gray-400'}`}>
                {isProcessing ? 'Architecting Search...' : 'Search Strategy'}
              </span>
            </div>
            {totalScanned > 0 && (
              <span className="text-[10px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded-full border border-gray-100">
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
                    <span key={idx} className="px-2 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600 font-mono">
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
                    <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">r/{s}</span>
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

          <div className="grid gap-3">
            {leads.map((lead, i) => {
              const typeInfo = TYPE_CONFIG[lead.leadType] || { icon: '🎯', label: lead.leadType || 'Lead' };
              return (
                <div key={lead.id || i} className="p-5 border border-gray-100 rounded-2xl hover:border-black transition-all bg-white group hover:shadow-sm">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 bg-gray-100 rounded-md text-gray-600">r/{lead.subreddit}</span>
                        <span className="text-[10px] font-medium text-gray-400">u/{lead.author}</span>
                      </div>
                      <h3 className="font-bold text-base leading-tight hover:underline cursor-pointer">
                        <a href={lead.link} target="_blank" rel="noreferrer">{lead.title}</a>
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{typeInfo.icon} {typeInfo.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.intentScore >= 9 ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                          {lead.intentScore}/10 INTENT
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => onSave?.(lead)} className="w-9 h-9 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">bookmark</span>
                      </button>
                      <a href={lead.link} target="_blank" rel="noreferrer" className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity">
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </a>
                    </div>
                  </div>

                  {lead.reasoning && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-3">
                      <div className="text-[9px] font-bold text-gray-400 uppercase mb-1 tracking-wider">AI Qualification reasoning</div>
                      <p className="text-xs text-gray-700 font-medium leading-relaxed">{lead.reasoning}</p>
                    </div>
                  )}

                  {lead.suggestedReply && (
                    <div className="relative p-3 border border-dashed border-gray-200 rounded-xl hover:border-black transition-colors group/reply cursor-pointer" onClick={() => copy(lead.suggestedReply)}>
                      <div className="text-[9px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Suggested Hook (Click to Copy)</div>
                      <p className="text-xs text-gray-600 italic">"{lead.suggestedReply}"</p>
                      <span className="absolute top-3 right-3 material-symbols-outlined text-gray-300 group-hover/reply:text-black text-[14px]">content_copy</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        isCompleted && !error && (
          <div className="p-10 border border-dashed border-gray-200 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-gray-300 text-[32px]">manage_search</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">No high-intent leads qualified</h3>
              <p className="text-xs text-gray-500 max-w-[320px] mx-auto leading-relaxed">
                I analyzed {totalScanned || 'all'} relevant posts found on Reddit, but none met our strict quality threshold (7/10 intent score). 
                Try searching for specific **competitor names** or **direct pain points** to find more active prospects.
              </p>
            </div>
          </div>
        )
      )}

      {/* Insights Section */}
      {insights && isCompleted && (
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 animate-in fade-in duration-1000">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">analytics</span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Market Intelligence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.topPainPoints?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Top Pain Points</span>
                <ul className="space-y-1">
                  {insights.topPainPoints.map((p, idx) => (
                    <li key={idx} className="text-xs font-medium text-gray-700 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.saasIdeas?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Opportunity Gaps</span>
                <ul className="space-y-1">
                  {insights.saasIdeas.map((s, idx) => (
                    <li key={idx} className="text-xs font-medium text-gray-700 flex items-start gap-2">
                      <span className="text-teal-400 mt-1">💡</span> {s}
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
