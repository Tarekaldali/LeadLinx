'use client';

import { useState } from 'react';
import './harvester.css';

export default function HarvesterPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('heuristics');
  const [depth, setDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(10);
  const [maxUrls, setMaxUrls] = useState(6);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobResult, setJobResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setJobResult(null);

    try {
      const res = await fetch('/api/harvester/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode,
          depth: parseInt(depth, 10),
          maxPages: parseInt(maxPages, 10),
          maxUrls: parseInt(maxUrls, 10),
          dryRun: false,
          noEnrich: false
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Harvester failed to start.');
      }

      setJobResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!jobResult?.jobId) return;
    window.location.href = `/api/harvester/export?jobId=${jobResult.jobId}&format=csv`;
  };

  return (
    <div className="harvester-container">
      <div className="harvester-header">
        <h1>LeadHarvester 🌾</h1>
        <p className="text-sm text-on-surface-variant">Advanced Web Crawler & AI Extractor</p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="harvester-controls">
          <div className="control-group">
            <label>Extraction Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="heuristics">Heuristics (Fast & Free)</option>
              <option value="llm">AI Powered (Deep Classification)</option>
            </select>
          </div>
          <div className="control-group">
            <label>Crawl Depth</label>
            <select value={depth} onChange={(e) => setDepth(e.target.value)}>
              <option value={0}>0 (Start URL only)</option>
              <option value={1}>1 (Follow immediate links)</option>
              <option value={2}>2 (Deep crawl)</option>
            </select>
          </div>
          <div className="control-group">
            <label>Max Discovered URLs</label>
            <input type="number" min="1" max="20" value={maxUrls} onChange={(e) => setMaxUrls(e.target.value)} />
          </div>
          <div className="control-group">
            <label>Max Pages to Crawl</label>
            <input type="number" min="1" max="50" value={maxPages} onChange={(e) => setMaxPages(e.target.value)} />
          </div>
        </div>

        <div className="search-bar">
          <input 
            type="text" 
            className="search-input"
            placeholder="e.g. 'marketing agencies in New York' or a direct domain like 'stripe.com'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="search-btn" disabled={loading || !query}>
            {loading ? 'Harvesting...' : 'Start Harvest'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="progress-section">
          <div className="spinner" />
          <span>Crawling the web, extracting contacts, and scoring leads...</span>
        </div>
      )}

      {jobResult && (
        <div className="results-section animate-in fade-in slide-in-from-bottom-4">
          <div className="results-header">
            <h3>Found {jobResult.leads?.length || 0} Leads</h3>
            <div className="flex gap-4 items-center">
              <span className="text-sm text-on-surface-variant">Pages: {jobResult.stats?.pagesCrawled} | Duplicates skipped: {jobResult.stats?.duplicatesFiltered}</span>
              <button onClick={handleExport} className="export-btn">
                Export to CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Name / Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {jobResult.leads?.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <span className={`score-badge ${lead.score >= 80 ? 'score-hot' : lead.score >= 50 ? 'score-warm' : 'score-cold'}`}>
                        {lead.score}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-white">{lead.author || lead.company}</div>
                      {lead.jobTitle && <div className="text-xs text-on-surface-variant">{lead.jobTitle}</div>}
                    </td>
                    <td className="text-on-surface-variant">{lead.email || '-'}</td>
                    <td className="text-on-surface-variant">{lead.phone || '-'}</td>
                    <td>
                      <a href={lead.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs">
                        {new URL(lead.link).hostname.replace('www.','')}
                      </a>
                    </td>
                  </tr>
                ))}
                {(!jobResult.leads || jobResult.leads.length === 0) && (
                  <tr>
                    <td colSpan="5" className="text-center text-on-surface-variant py-8">
                      No high-intent leads found. Try a broader search or increase max pages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
