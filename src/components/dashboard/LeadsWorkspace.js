'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { 
  Search, Filter, Download, Trash2, 
  ChevronLeft, ChevronRight, MoreHorizontal,
  ExternalLink, Bookmark, BookmarkCheck,
  Calendar, Building2, User, Mail, Phone,
  Globe, Hash, BarChart3, Clock, X, Zap
} from 'lucide-react';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { SummaryCards } from './SummaryCards';

import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadsWorkspace() {
  const [activeTab, setActiveTab] = useState('generated'); // generated | saved
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null); // For drawer

  // Data Fetching
  const { data, error, isLoading, mutate } = useSWR(
    `/api/leads?tab=${activeTab}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=${limit}`,
    fetcher,
    { keepPreviousData: true }
  );

  const { data: stats, isLoading: statsLoading } = useSWR('/api/leads/stats', fetcher);

  // Handlers
  const handleToggleSelectAll = () => {
    if (selectedLeads.length === data?.leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(data?.leads.map(l => l._id) || []);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedLeads.length || !confirm(`Delete ${selectedLeads.length} leads?`)) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeads, tab: activeTab })
      });
      if (res.ok) {
        mutate();
        setSelectedLeads([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLead = async (lead) => {
    try {
      const res = await fetch('/api/leads/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLead = async (id, updates) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tab: activeTab, updates })
      });
      if (res.ok) {
        mutate();
        if (selectedLead && selectedLead._id === id) {
          setSelectedLead({ ...selectedLead, ...updates });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    // Basic CSV Export
    const leadsToExport = data?.leads || [];
    if (!leadsToExport.length) return;
    
    const headers = ["Company", "Contact", "Email", "Phone", "Score", "Source", "Date"];
    const rows = leadsToExport.map(l => [
      l.company || 'N/A',
      l.author || 'N/A',
      (l.emails || []).join(', '),
      (l.phones || []).join(', '),
      l.score,
      l.source || l.subreddit,
      formatDate(l.createdAt)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leadlinx_${activeTab}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-deep-bg dark:bg-background transition-colors duration-300">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Leads Workspace</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Manage, filter, and curate your AI-generated intelligence.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-surface border border-border-glass rounded-xl text-xs font-bold shadow-sm hover:border-primary/30 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Export CSV
            </button>
            {selectedLeads.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold shadow-sm hover:bg-primary/20 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete Selected ({selectedLeads.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <SummaryCards stats={stats} loading={statsLoading} />

        {/* Main Workspace Card */}
        <div className="bg-surface bento-card flex-1 flex flex-col overflow-hidden border border-border-glass">
          
          {/* Workspace Tabs & Filters */}
          <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-border-glass">
            <div className="px-6 flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => { setActiveTab('generated'); setPage(1); }}
                  className={cn(
                    "relative h-16 flex items-center text-sm font-bold transition-colors",
                    activeTab === 'generated' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  Generated Leads
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-primary/5 text-[10px]">
                    {stats?.generatedCount || 0}
                  </span>
                  {activeTab === 'generated' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => { setActiveTab('saved'); setPage(1); }}
                  className={cn(
                    "relative h-16 flex items-center text-sm font-bold transition-colors",
                    activeTab === 'saved' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  Saved Pipeline
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-secondary/5 text-[10px]">
                    {stats?.savedCount || 0}
                  </span>
                  {activeTab === 'saved' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="relative flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:block">Sort By</span>
                  <select 
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                    className="pl-3 pr-8 py-2 bg-surface-container-low border border-border-glass rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="score-desc">Highest Intent</option>
                    <option value="score-asc">Lowest Intent</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <MoreHorizontal size={12} className="rotate-90" />
                  </div>
                </div>

                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search prospects..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 pr-4 py-2 bg-surface-container-low border border-border-glass rounded-xl text-xs w-[200px] focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none"
                  />
                </div>
                
                <button className="relative p-2 bg-surface-container-low border border-border-glass rounded-xl text-gray-500 hover:text-primary hover:border-primary/30 transition-all">
                  <Filter size={16} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-surface animate-pulse" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      checked={selectedLeads.length > 0 && selectedLeads.length === data?.leads.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th>Prospect / Company</th>
                  <th>Contact Info</th>
                  <th>Source / Subreddit</th>
                  <th>Intent Score</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4"><div className="h-10 w-full skeleton" /></td>
                    </tr>
                  ))
                ) : data?.leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-50">
                        <div className="p-6 bg-surface-container-low rounded-full">
                          <Bookmark size={48} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">No leads found</p>
                          <p className="text-xs max-w-xs mx-auto">
                            {activeTab === 'saved' 
                              ? "You haven't bookmarked any leads for follow-up yet." 
                              : "The AI is working in the background. New leads will appear here."}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.leads.map((lead) => (
                    <tr 
                      key={lead._id} 
                      className={cn(
                        "group cursor-pointer transition-all",
                        selectedLeads.includes(lead._id) ? "bg-primary/5" : "hover:bg-surface-container-low"
                      )}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="w-12" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={selectedLeads.includes(lead._id)}
                          onChange={() => handleToggleSelect(lead._id)}
                        />
                      </td>
                      <td className="max-w-[300px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1d1d1f] dark:text-white truncate">
                            {lead.author || 'Anonymous'}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                            <Building2 size={10} /> {lead.company || 'Individual Prospect'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {lead.emails?.[0] ? (
                            <span className="text-[11px] font-medium flex items-center gap-1 text-primary">
                              <Mail size={10} /> {lead.emails[0]}
                            </span>
                          ) : lead.phones?.[0] ? (
                            <span className="text-[11px] font-medium flex items-center gap-1 text-secondary">
                              <Phone size={10} /> {lead.phones[0]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Request Details</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-on-surface">r/{lead.subreddit || lead.source}</span>
                          {lead.isFromMonitor && (
                            <span className="text-[9px] font-bold text-lime-green uppercase tracking-tighter flex items-center gap-1">
                              <Zap size={8} fill="currentColor" /> Monitor
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                lead.score >= 80 ? "bg-lime-green" : lead.score >= 50 ? "bg-tertiary" : "bg-primary"
                              )}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="font-data-value text-[11px]">{lead.score}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(lead.createdAt)}
                        </span>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleSaveLead(lead)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title={lead.isSaved ? "Already Saved" : "Save to Pipeline"}
                          >
                            {lead.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-on-surface hover:bg-surface-container-highest rounded-lg transition-all">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-surface-container-low border-t border-border-glass flex items-center justify-between">
            <p className="text-[11px] text-on-surface-variant font-medium">
              Showing <span className="font-bold text-on-surface">{(page - 1) * limit + 1}</span> to <span className="font-bold text-on-surface">{Math.min(page * limit, data?.pagination.total || 0)}</span> of <span className="font-bold text-on-surface">{data?.pagination.total || 0}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 bg-surface border border-border-glass rounded-lg text-gray-500 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-500 transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data?.pagination.totalPages || 0) }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      page === i + 1 ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-surface border border-border-glass text-gray-500 hover:border-primary/30"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === data?.pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 bg-surface border border-border-glass rounded-lg text-gray-500 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-500 transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedLead(null)} 
          />
          <div className="relative w-full max-w-xl bg-surface h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-border-glass">
            <div className="p-6 border-b border-border-glass flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{selectedLead.author}</h2>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Hash size={10} /> Lead ID: {selectedLead._id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Intent Analysis */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Intent Analysis</h3>
                </div>
                <div className="bg-surface-container-low border border-border-glass rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-on-surface">{selectedLead.score}%</div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Strength</span>
                        <span className={cn(
                          "text-xs font-bold",
                          selectedLead.score >= 80 ? "text-lime-green" : "text-tertiary"
                        )}>
                          {selectedLead.score >= 80 ? "Highly Likely Buyer" : "Warm Lead"}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-surface-container-highest flex items-center justify-center">
                       <span className="text-xs font-bold">AI</span>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-border-glass">
                    {selectedLead.intentReason || "This lead shows specific interest in services matching your monitor's goal. They are actively seeking solutions and have expressed clear pain points in their Reddit contribution."}
                  </p>
                </div>
              </section>

              {/* Context / Content */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-secondary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Context</h3>
                </div>
                <div className="bg-white dark:bg-black/20 border border-border-glass rounded-2xl p-6">
                  <h4 className="font-bold text-lg mb-3">{selectedLead.title}</h4>
                  <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                    {selectedLead.body}
                  </div>
                </div>
              </section>

              {/* Contact Info */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={16} className="text-tertiary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Contact Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-border-glass">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Addresses</span>
                    <div className="space-y-1">
                      {selectedLead.emails?.length > 0 ? selectedLead.emails.map(e => (
                        <div key={e} className="text-sm font-medium text-primary flex items-center gap-2">
                          {e} <button className="p-1 hover:bg-primary/5 rounded"><ExternalLink size={12}/></button>
                        </div>
                      )) : <span className="text-xs text-gray-400 italic">None detected</span>}
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-border-glass">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Phone Numbers</span>
                    <div className="space-y-1">
                      {selectedLead.phones?.length > 0 ? selectedLead.phones.map(p => (
                        <div key={p} className="text-sm font-medium text-secondary flex items-center gap-2">
                          {p} <button className="p-1 hover:bg-secondary/5 rounded"><ExternalLink size={12}/></button>
                        </div>
                      )) : <span className="text-xs text-gray-400 italic">None detected</span>}
                    </div>
                  </div>
                </div>
              </section>

              {/* Management */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Hash size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Management</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-border-glass">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Lead Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['New', 'Contacted', 'Qualified', 'Lost'].map(s => (
                        <button 
                          key={s}
                          onClick={() => handleUpdateLead(selectedLead._id, { status: s })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            (selectedLead.status || 'New') === s 
                              ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                              : "bg-surface border-border-glass text-gray-500 hover:border-primary/30"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-border-glass">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Quick Notes</label>
                    <textarea 
                      placeholder="Add specific follow-up notes or internal tags..."
                      defaultValue={selectedLead.notes || ''}
                      onBlur={(e) => handleUpdateLead(selectedLead._id, { notes: e.target.value })}
                      className="w-full bg-white dark:bg-black/20 border border-border-glass rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-border-glass bg-surface-container-low flex items-center gap-4">
              <Link 
                href={selectedLead.link || '#'} 
                target="_blank"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-on-surface text-white dark:bg-white dark:text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-black/10"
              >
                <ExternalLink size={18} /> View Original Post
              </Link>
              <button 
                onClick={() => handleSaveLead(selectedLead)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Bookmark size={18} /> {selectedLead.isSaved ? "Saved" : "Save Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
