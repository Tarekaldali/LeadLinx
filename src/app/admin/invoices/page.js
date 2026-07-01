'use client';
import { useState, useEffect } from 'react';

export default function AdminInvoicesPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPlan, setFilterPlan] = useState('All');

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesStatus = filterStatus === 'All' || tx.status === filterStatus;
    const matchesPlan = filterPlan === 'All' || tx.planKey === filterPlan;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (tx.user?.email?.toLowerCase().includes(searchLower)) ||
      (tx.user?.name?.toLowerCase().includes(searchLower)) ||
      (tx.tapChargeId?.toLowerCase().includes(searchLower));

    return matchesStatus && matchesPlan && matchesSearch;
  });

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full"></div>)}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">Invoice Management</h1>
          <p className="text-on-surface-variant font-body">View and search Tap Payments transactions and invoices.</p>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface-dim border border-border-glass p-4 rounded-xl">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input
            type="text"
            placeholder="Search by email, name, or charge ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border-glass rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:border-primary outline-none"
          />
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface-variant whitespace-nowrap">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-background border border-border-glass rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="CAPTURED">Captured</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="DECLINED">Declined</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface-variant whitespace-nowrap">Plan:</span>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-background border border-border-glass rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
            >
              <option value="All">All Plans</option>
              <option value="plus">Plus</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Charge ID</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx._id}>
                  <td>
                    <div className="font-medium text-on-surface text-sm">{tx.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-on-surface-variant">{tx.user?.email || 'No email attached'}</div>
                  </td>
                  <td>
                    <code className="text-xs bg-surface-dim px-2 py-1 rounded text-on-surface">{tx.tapChargeId}</code>
                  </td>
                  <td>
                    <span className="capitalize font-medium text-sm text-on-surface">{tx.planKey || 'Unknown'}</span>
                  </td>
                  <td className="font-bold text-sm text-on-surface">
                    {tx.amount?.toFixed(2)} <span className="text-xs text-on-surface-variant">{tx.currency}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      tx.status === 'CAPTURED' ? 'badge-growth' : 
                      (tx.status === 'FAILED' || tx.status === 'DECLINED') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      'badge-starter'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="text-sm text-on-surface-variant">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-on-surface-variant">
                    {transactions.length > 0 ? "No transactions match your search filters." : "No transactions found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
