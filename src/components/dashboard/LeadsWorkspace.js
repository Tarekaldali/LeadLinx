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
  const [view, setView] = useState('groups'); // groups | leads
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('generated'); // generated | saved
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null); // For drawer
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'danger' });

  // Data Fetching
  const fetchUrl = selectedGroup 
    ? `/api/leads?tab=${activeTab}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=${limit}&groupId=${selectedGroup.id}&groupType=${selectedGroup.type}`
    : `/api/leads?tab=${activeTab}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=${limit}`;

  const { data, error, isLoading, mutate } = useSWR(fetchUrl, fetcher, { keepPreviousData: true });

  const { data: groupsData, isLoading: groupsLoading, mutate: mutateGroups } = useSWR(
    activeTab === 'generated' ? '/api/leads/groups' : null, 
    fetcher
  );

  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useSWR('/api/leads/stats', fetcher);

  // Pagination Logic
  const getPageNumbers = () => {
    const totalPages = data?.pagination.totalPages || 0;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(page - 1);
      pages.push(page);
      pages.push(page + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Handlers
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setView('leads');
    setPage(1);
  };

  const handleBackToGroups = () => {
    setView('groups');
    setSelectedGroup(null);
    setSearch('');
  };

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

  const handleBulkDelete = () => {
    if (!selectedLeads.length) return;
    setConfirmModal({
      open: true,
      title: 'Delete Leads',
      message: `Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/leads', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedLeads, tab: activeTab })
          });
          if (res.ok) {
            mutate();
            mutateStats();
            mutateGroups();
            setSelectedLeads([]);
            setConfirmModal(prev => ({ ...prev, open: false }));
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteGroup = (e, group) => {
    e.stopPropagation(); // Don't trigger group selection
    setConfirmModal({
      open: true,
      title: `Delete ${group.sourceType}`,
      message: `Are you sure you want to delete "${group.title}" and all its ${group.leadCount} leads? This cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/leads/groups?id=${group.id}&type=${group.type}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            mutateGroups();
            mutate();
            mutateStats();
            setConfirmModal(prev => ({ ...prev, open: false }));
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleSaveLead = async (lead) => {
    try {
      const res = await fetch('/api/leads/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) {
        mutate();
        mutateGroups();
        mutateStats();
      }
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
        mutateGroups();
        mutateStats();
        if (selectedLead && selectedLead._id === id) {
          setSelectedLead({ ...selectedLead, ...updates });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      // Build export URL (same filters as current view, but with export=true)
      const exportUrl = selectedGroup 
        ? `/api/leads?tab=${activeTab}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&groupId=${selectedGroup.id}&groupType=${selectedGroup.type}&export=true`
        : `/api/leads?tab=${activeTab}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&export=true`;

      const res = await fetch(exportUrl);
      const { leads: leadsToExport } = await res.json();
      
      if (!leadsToExport || !leadsToExport.length) return;
      
      const headers = ["Author", "Company", "Title", "Post Link", "Source", "Email", "Phone", "Score", "Intent Reasoning", "Date"];
      const rows = leadsToExport.map(l => [
        `"${(l.author || 'Anonymous').replace(/"/g, '""')}"`,
        `"${(l.company || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.title || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.link || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.subreddit || l.source || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.emails || []).join(', ').replace(/"/g, '""')}"`,
        `"${(l.phones || []).join(', ').replace(/"/g, '""')}"`,
        l.score || 0,
        `"${(l.intentReason || l.body || '').substring(0, 1000).replace(/"/g, '""')}"`,
        formatDate(l.createdAt)
      ]);

      const csvContent = "\uFEFF" // UTF-8 BOM
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `leadlinx_${activeTab}_leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-deep-bg dark:bg-background transition-colors duration-300">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            {view === 'leads' && (
              <button 
                onClick={handleBackToGroups}
                className="p-3 bg-surface border border-border-glass rounded-2xl hover:bg-surface-container-low transition-all text-on-surface-variant hover:text-primary"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                  {selectedGroup ? selectedGroup.title : 'Leads Workspace'}
                </h1>
                {selectedGroup && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    selectedGroup.type === 'monitor' ? "bg-lime-green/10 text-lime-green" : "bg-primary/10 text-primary"
                  )}>
                    {selectedGroup.sourceType}
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant mt-1 text-sm">
                {selectedGroup 
                  ? `Viewing leads from ${selectedGroup.title}. Total: ${selectedGroup.leadCount}`
                  : 'Manage, filter, and curate your AI-generated intelligence.'}
              </p>
            </div>
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
                  onClick={() => { setActiveTab('generated'); setView('groups'); setSelectedGroup(null); setPage(1); }}
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
                  onClick={() => { setActiveTab('saved'); setView('leads'); setSelectedGroup(null); setPage(1); }}
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
                
                <button 
                  title="Filter Leads"
                  className="relative p-2 bg-surface-container-low border border-border-glass rounded-xl text-gray-500 hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Filter size={16} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-surface animate-pulse" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container or Groups Grid */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6">
            {view === 'groups' && activeTab === 'generated' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-48 skeleton rounded-3xl" />
                  ))
                ) : groupsData?.groups.length === 0 ? (
                  <div className="col-span-full py-24 text-center opacity-50">
                    <div className="p-6 bg-surface-container-low rounded-full w-fit mx-auto mb-4">
                      <BarChart3 size={48} className="text-gray-400" />
                    </div>
                    <p className="font-bold text-lg">No lead groups yet</p>
                    <p className="text-xs">Start a manual search or create a monitor to see grouped results.</p>
                  </div>
                ) : (
                  groupsData?.groups.map((group) => (
                    <div 
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className="group relative flex flex-col bg-surface-container-low border border-border-glass rounded-[2.5rem] p-6 hover:border-primary/30 hover:bg-surface-container-high transition-all text-left shadow-sm hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98] cursor-pointer"
                    >
                      {/* Delete Group Button */}
                      <button 
                        onClick={(e) => handleDeleteGroup(e, group)}
                        className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/20 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="Delete this group and all its leads"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                          "p-4 rounded-[1.5rem] shadow-inner",
                          group.type === 'monitor' ? "bg-lime-green/10 text-lime-green" : "bg-primary/10 text-primary"
                        )}>
                          {group.type === 'monitor' ? <Zap size={24} fill="currentColor" /> : <Search size={24} />}
                        </div>
                        <div className="flex flex-col items-end mr-6">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{group.sourceType}</span>
                          <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                            group.status === 'active' ? "bg-lime-green/20 text-lime-green" : "bg-gray-400/20 text-gray-400"
                          )}>
                            {group.status}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-on-surface line-clamp-2 mb-2 group-hover:text-primary transition-colors pr-4">
                        {group.title}
                      </h3>

                      <div className="mt-auto space-y-3 pt-4 border-t border-border-glass/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-on-surface-variant">
                            <Hash size={14} />
                            <span className="text-xs font-bold">Total Leads</span>
                          </div>
                          <span className="text-lg font-data-value text-on-surface">{group.leadCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>Last update: {formatDate(group.updatedAt)}</span>
                          </div>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
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
                          <a 
                            href={lead.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-on-surface hover:text-primary flex items-center gap-1 transition-colors group/link"
                          >
                            {'r/'}{lead.subreddit || lead.source}
                            <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </a>
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
          )}
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
                {getPageNumbers().map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => typeof p === 'number' && setPage(p)}
                    disabled={p === '...'}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      page === p ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-surface border border-border-glass text-gray-500 hover:border-primary/30",
                      p === '...' && "border-none bg-transparent cursor-default"
                    )}
                  >
                    {p}
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
      {/* Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
          <div className="relative bg-surface w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-border-glass animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">{confirmModal.title}</h2>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface-variant rounded-2xl font-bold text-sm hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
