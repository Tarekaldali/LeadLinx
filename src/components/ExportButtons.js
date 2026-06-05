'use client';
import { useState } from 'react';
import { exportToXLSX, exportMultipleSheetsToXLSX } from '@/lib/exportUtils';

export default function ExportButtons({ currentData, currentPageName }) {
  const [exportingAll, setExportingAll] = useState(false);

  const handleExportCurrent = () => {
    if (!currentData || currentData.length === 0) {
      alert("No data available to export on this page.");
      return;
    }
    exportToXLSX(currentData, `${currentPageName}_export`, currentPageName);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) throw new Error('Failed to fetch global export data');
      const data = await res.json();
      
      exportMultipleSheetsToXLSX(data, 'LeadLinx_Full_Export');
    } catch (err) {
      alert('Error exporting all data: ' + err.message);
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button 
        onClick={handleExportCurrent}
        className="btn-ghost flex items-center gap-2 border border-border-glass bg-surface"
      >
        <span className="material-symbols-outlined text-sm text-secondary">download</span>
        Export {currentPageName} (XLSX)
      </button>
      
      <button 
        onClick={handleExportAll}
        disabled={exportingAll}
        className="btn-primary flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">database</span>
        {exportingAll ? 'Exporting...' : 'Export All Data (XLSX)'}
      </button>
    </div>
  );
}
