'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/app/dashboard/layout';

const OUTREACH_COST = 10; // credits per generation — same cost logic as extraction

const PLATFORM_OPTIONS = [
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'linkedin', label: 'LinkedIn DM', icon: 'person_add' },
  { value: 'twitter', label: 'Twitter / X DM', icon: 'chat' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'direct', label: 'Direct & Punchy' },
  { value: 'persuasive', label: 'Persuasive' },
];

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function OutreachWorkspace() {
  const { user, updateCredits } = useDashboard() || {};

  // View: 'generate' | 'history'
  const [activeView, setActiveView] = useState('generate');

  // Lead selector
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);

  // Generator state
  const [manualContext, setManualContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('email');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Load saved leads for the selector
  useEffect(() => {
    fetch('/api/leads/saved')
      .then(r => r.json())
      .then(d => setLeads(d.leads || []))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, []);

  // Load history when switching to history tab
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/outreach/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'history') loadHistory();
  }, [activeView, loadHistory]);

  // Build the context string that will be sent to the AI
  const buildContext = () => {
    if (selectedLead) {
      const parts = [
        selectedLead.title && `Post title: "${selectedLead.title}"`,
        selectedLead.text && `Post content: "${selectedLead.text?.substring(0, 400)}"`,
        selectedLead.author && `Author: ${selectedLead.author}`,
        selectedLead.subreddit && `Community: r/${selectedLead.subreddit}`,
        selectedLead.emails?.length && `Emails found: ${selectedLead.emails.join(', ')}`,
        selectedLead.intentReason && `Intent reason: ${selectedLead.intentReason}`,
      ].filter(Boolean).join('\n');
      return parts + (manualContext ? `\n\nAdditional context: ${manualContext}` : '');
    }
    return manualContext;
  };

  const filteredLeads = leads.filter(l => {
    const q = leadSearch.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.author?.toLowerCase().includes(q) ||
      l.subreddit?.toLowerCase().includes(q)
    );
  });

  const handleGenerate = async () => {
    const context = buildContext();
    if (!context.trim()) {
      setError('Please select a lead or enter context before generating.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedText('');

    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, tone, platform }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate outreach.');

      setGeneratedText(data.text);

      // Update credits using the server-authoritative remaining count
      if (data.creditsRemaining !== undefined) {
        updateCredits(data.creditsRemaining);
      } else if (user) {
        updateCredits((user.credits || 0) - OUTREACH_COST);
      }

      // Auto-save to history
      await fetch('/api/outreach/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedText: data.text,
          platform,
          tone,
          context: context.substring(0, 500),
          leadId: selectedLead?._id?.toString() ?? null,
          leadName: selectedLead?.author ?? 'Manual Context',
          leadTitle: selectedLead?.title ?? null,
        }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteHistory = async (id) => {
    await fetch(`/api/outreach/history?id=${id}`, { method: 'DELETE' });
    setHistory(prev => prev.filter(h => h._id !== id));
  };

  const currentCredits = user?.credits ?? 0;
  const canGenerate = currentCredits >= OUTREACH_COST;

  const platformIcon = PLATFORM_OPTIONS.find(p => p.value === platform)?.icon ?? 'email';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-header */}
      <div className="shrink-0 border-b border-outline-variant bg-background/80 backdrop-blur-md px-8 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">AI Outreach</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Generate personalized messages for your CRM leads
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-container-low border border-outline-variant rounded-xl">
          <button
            onClick={() => setActiveView('generate')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === 'generate'
                ? 'bg-surface text-on-surface shadow-sm border border-outline-variant'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Generate
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === 'history'
                ? 'bg-surface text-on-surface shadow-sm border border-outline-variant'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            History
            {history.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                {Math.min(history.length, 99)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ─── GENERATE VIEW ─── */}
        {activeView === 'generate' && (
          <div className="p-6 md:p-8 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
              {/* LEFT: Inputs */}
              <div className="space-y-5">

                {/* STEP 1: Select Lead */}
                <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">1</div>
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Select Lead from CRM</h3>
                  </div>

                  {/* Lead Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setLeadDropdownOpen(o => !o)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedLead
                          ? 'bg-primary/5 border-primary/30 text-on-surface'
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0">person</span>
                        <div className="min-w-0">
                          {selectedLead ? (
                            <>
                              <div className="font-semibold text-on-surface truncate">{selectedLead.author || 'Unknown'}</div>
                              <div className="text-[11px] text-on-surface-variant truncate">{selectedLead.title?.substring(0, 50) || 'No title'}</div>
                            </>
                          ) : (
                            <span className="text-on-surface-variant">Pick a lead from your CRM…</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedLead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedLead(null); }}
                            className="w-5 h-5 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        )}
                        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${leadDropdownOpen ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </button>

                    {leadDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-surface rounded-2xl border border-outline-variant shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-outline-variant">
                          <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
                            <input
                              type="text"
                              placeholder="Search leads…"
                              value={leadSearch}
                              onChange={e => setLeadSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none text-on-surface placeholder:text-on-surface-variant"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {leadsLoading ? (
                            <div className="py-8 text-center text-sm text-on-surface-variant">Loading leads…</div>
                          ) : filteredLeads.length === 0 ? (
                            <div className="py-8 text-center text-sm text-on-surface-variant">
                              {leads.length === 0 ? 'No leads saved yet. Save some leads from Find Leads first.' : 'No leads match your search.'}
                            </div>
                          ) : (
                            filteredLeads.map(lead => (
                              <button
                                key={lead._id}
                                onClick={() => { setSelectedLead(lead); setLeadDropdownOpen(false); setLeadSearch(''); }}
                                className={`w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors flex items-start gap-3 border-b border-outline-variant/40 last:border-0 ${
                                  selectedLead?._id === lead._id ? 'bg-primary/5' : ''
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[11px] font-bold text-primary uppercase">
                                    {(lead.author || '?')[0]}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-on-surface">{lead.author || 'Unknown'}</span>
                                    {lead.subreddit && (
                                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">r/{lead.subreddit}</span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-on-surface-variant truncate mt-0.5">{lead.title || 'No title'}</div>
                                  {lead.intentScore && (
                                    <div className="text-[10px] text-primary font-bold mt-0.5">{lead.intentScore}/10 Intent Score</div>
                                  )}
                                </div>
                                {selectedLead?._id === lead._id && (
                                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">check_circle</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected lead preview */}
                  {selectedLead && (
                    <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50 text-[12px] text-on-surface-variant space-y-1">
                      {selectedLead.emails?.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-primary">email</span>
                          <span>{selectedLead.emails.join(', ')}</span>
                        </div>
                      )}
                      {selectedLead.phones?.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-primary">phone</span>
                          <span>{selectedLead.phones.join(', ')}</span>
                        </div>
                      )}
                      {selectedLead.intentReason && (
                        <div className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">psychology</span>
                          <span className="line-clamp-2">{selectedLead.intentReason}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* STEP 2: Additional Context */}
                <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">2</div>
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                      {selectedLead ? 'Additional Context (Optional)' : 'Lead Context'}
                    </h3>
                  </div>
                  <textarea
                    value={manualContext}
                    onChange={e => setManualContext(e.target.value)}
                    placeholder={
                      selectedLead
                        ? 'Add any extra details about this lead or your offer…'
                        : "Describe the lead. E.g., 'Looking for a CRM for a real estate agency in Texas, struggling with manual follow-ups...'"
                    }
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* STEP 3: Options */}
                <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">3</div>
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Platform & Tone</h3>
                  </div>

                  {/* Platform toggle */}
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Platform</label>
                    <div className="flex gap-2">
                      {PLATFORM_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setPlatform(p.value)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                            platform === p.value
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                              : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary/30'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone select */}
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Tone</label>
                    <select
                      value={tone}
                      onChange={e => setTone(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    >
                      {TONE_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Generate Button */}
                <div>
                  {error && (
                    <div className="mb-3 flex items-start gap-2 text-[#ff3b30] text-sm font-medium p-3 bg-red-50 rounded-xl border border-red-200">
                      <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !canGenerate || (!selectedLead && !manualContext.trim())}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                        Generating…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                        Generate
                        <span className="flex items-center gap-1 ml-1 px-2.5 py-1 bg-white/20 rounded-lg text-sm font-black">
                          <span className="material-symbols-outlined text-[14px]">bolt</span>
                          {OUTREACH_COST} Credits
                        </span>
                      </>
                    )}
                  </button>
                  {!canGenerate && (
                    <p className="text-[11px] text-center text-on-surface-variant mt-2">
                      You need at least {OUTREACH_COST} credits. You have {currentCredits}.
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT: Output */}
              <div className="flex flex-col gap-4">
                <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">{platformIcon}</span>
                      <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Generated Message</h3>
                    </div>
                    {generatedText && (
                      <button
                        onClick={handleCopy}
                        className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${
                          copied
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : 'border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-4 relative min-h-[300px]">
                    {loading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium">Crafting your message…</span>
                      </div>
                    ) : generatedText ? (
                      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">
                        {generatedText}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant/50">
                        <span className="material-symbols-outlined text-5xl mb-3">mark_email_unread</span>
                        <p className="text-sm font-medium">Your AI-generated outreach message will appear here.</p>
                        <p className="text-xs mt-1">Select a lead and click Generate to start.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── HISTORY VIEW ─── */}
        {activeView === 'history' && (
          <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Message History</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">All previously generated outreach messages</p>
              </div>
              {history.length > 0 && (
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {history.length} message{history.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-sm">Loading history…</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-outline-variant rounded-3xl bg-surface-dim">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">history</span>
                <p className="text-on-surface-variant font-medium">No messages generated yet.</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Generate your first outreach message to see it here.</p>
                <button
                  onClick={() => setActiveView('generate')}
                  className="mt-4 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl"
                >
                  Go to Generate
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(item => {
                  const isExpanded = expandedHistory === item._id;
                  const platformMeta = PLATFORM_OPTIONS.find(p => p.value === item.platform);
                  return (
                    <div
                      key={item._id}
                      className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setExpandedHistory(isExpanded ? null : item._id)}
                        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface-container-low/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              {platformMeta?.icon ?? 'email'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-on-surface">
                                {item.leadName || 'Manual Context'}
                              </span>
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                                {platformMeta?.label ?? item.platform}
                              </span>
                              <span className="text-[10px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full capitalize">
                                {item.tone}
                              </span>
                            </div>
                            {item.leadTitle && (
                              <div className="text-[12px] text-on-surface-variant truncate mt-0.5">{item.leadTitle}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-[11px] text-on-surface-variant hidden sm:block">{timeAgo(item.createdAt)}</span>
                          <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-outline-variant/50">
                          <div className="mt-4 bg-surface-container-low rounded-xl p-4 text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap">
                            {item.generatedText}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-on-surface-variant">{new Date(item.createdAt).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigator.clipboard.writeText(item.generatedText)}
                                className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                Copy
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(item._id)}
                                className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
