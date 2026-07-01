'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [refundingTo, setRefundingTo] = useState(null);
  const [refundChargeId, setRefundChargeId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundCurrency, setRefundCurrency] = useState('USD');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [toast, setToast] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/support');
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      if (res.ok) {
        showToast('Status updated');
        fetchTickets();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/support?id=${ticketId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Ticket deleted');
        fetchTickets();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete ticket');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: replyingTo._id, replyMessage }),
      });
      if (res.ok) {
        showToast('Reply sent successfully');
        setReplyingTo(null);
        setReplyMessage('');
        fetchTickets();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reply');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleRefund = async () => {
    if (!refundChargeId || !refundAmount || !refundCurrency) return;
    setProcessingRefund(true);
    try {
      const res = await fetch('/api/admin/tap-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chargeId: refundChargeId, 
          amount: parseFloat(refundAmount), 
          currency: refundCurrency,
          userId: refundingTo.userId, // Will update user sub if exists
          reason: 'Requested by user via support ticket'
        }),
      });
      if (res.ok) {
        showToast('Refund processed successfully');
        setRefundingTo(null);
        setRefundChargeId('');
        setRefundAmount('');
        // Optional: you could update the ticket status to Solved here
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process refund');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus || (!ticket.status && filterStatus === 'Open');
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (ticket.name?.toLowerCase().includes(searchLower)) ||
      (ticket.email?.toLowerCase().includes(searchLower)) ||
      (ticket.contact_email?.toLowerCase().includes(searchLower)) ||
      (ticket.registered_email?.toLowerCase().includes(searchLower)) ||
      (ticket.subject?.toLowerCase().includes(searchLower)) ||
      (ticket.message?.toLowerCase().includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full"></div>)}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">Support Tickets</h1>
          <p className="text-on-surface-variant font-body">Manage and respond to user inquiries and complaints.</p>
        </div>
        <button onClick={fetchTickets} className="btn-ghost flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </header>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface-dim border border-border-glass p-4 rounded-xl">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input
            type="text"
            placeholder="Search by name, email, subject, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border-glass rounded-lg pl-9 pr-4 py-2 text-sm text-on-surface focus:border-primary outline-none"
          />
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface-variant whitespace-nowrap">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto bg-background border border-border-glass rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Solved">Solved</option>
            <option value="Not Solved">Not Solved</option>
            <option value="Spam">Spam</option>
          </select>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Registered Email</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr key={ticket._id}>
                  <td>
                    <div className="font-medium text-on-surface text-sm">{ticket.name}</div>
                    <div className="text-xs text-on-surface-variant">{ticket.contact_email || ticket.email}</div>
                  </td>
                  <td>
                    {ticket.registered_email ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-on-surface font-medium">{ticket.registered_email}</span>
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block w-fit">Verified Account</span>
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">—</span>
                    )}
                  </td>
                  <td className="font-medium text-sm text-on-surface max-w-[200px] truncate" title={ticket.subject}>
                    {ticket.subject}
                  </td>
                  <td className="max-w-[300px] truncate text-sm text-on-surface-variant" title={ticket.message}>
                    {ticket.message}
                  </td>
                  <td>
                    <select 
                      value={ticket.status || 'Open'} 
                      onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                      className="bg-surface-dim border border-border-glass rounded text-xs px-2 py-1 outline-none focus:border-primary text-on-surface"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                      <option value="Not Solved">Not Solved</option>
                      <option value="Spam">Spam</option>
                    </select>
                  </td>
                  <td className="text-sm text-on-surface-variant">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setReplyingTo(ticket)} 
                        className="btn-ghost text-xs py-1 px-3 text-primary border border-primary/20 hover:bg-primary hover:text-white"
                      >
                        Reply
                      </button>
                      <button 
                        onClick={() => setRefundingTo(ticket)} 
                        className="btn-ghost text-xs py-1 px-3 text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white"
                      >
                        Refund
                      </button>
                      <button 
                        onClick={() => handleDelete(ticket._id)}
                        className="btn-ghost text-xs py-1 px-2 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                        title="Delete ticket"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-on-surface-variant">
                    {tickets.length > 0 ? "No tickets match your search filters." : "No support tickets found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={!!replyingTo} 
        onClose={() => setReplyingTo(null)} 
        title={`Reply to ${replyingTo?.name}`}
      >
        <div className="space-y-6">
          <div className="bg-surface-dim p-4 rounded-xl text-sm text-on-surface-variant border border-border-glass max-h-40 overflow-y-auto">
            <strong>Original Message:</strong><br/>
            {replyingTo?.message}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-data-label text-on-surface-variant">YOUR REPLY</label>
            <textarea
              rows={6}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your response here. This will be sent directly to the user's email."
              className="input-field w-full resize-y"
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setReplyingTo(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleReply}
              disabled={sending || !replyMessage.trim()}
              className="btn-primary"
            >
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!refundingTo} 
        onClose={() => setRefundingTo(null)} 
        title={`Process Refund for ${refundingTo?.name}`}
      >
        <div className="space-y-6">
          <div className="bg-orange-500/10 p-4 rounded-xl text-sm text-orange-600 border border-orange-500/20">
            <strong>Warning:</strong> Processing a refund will automatically cancel the user's subscription and reset their credits to 10 if they have a registered account.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-data-label text-on-surface-variant">TAP CHARGE ID</label>
              <input
                type="text"
                value={refundChargeId}
                onChange={(e) => setRefundChargeId(e.target.value)}
                placeholder="e.g. chg_TS01A4920261913De5k3006813"
                className="input-field w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">AMOUNT</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 19.99"
                  className="input-field w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">CURRENCY</label>
                <input
                  type="text"
                  value={refundCurrency}
                  onChange={(e) => setRefundCurrency(e.target.value)}
                  placeholder="USD"
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setRefundingTo(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleRefund}
              disabled={processingRefund || !refundChargeId || !refundAmount || !refundCurrency}
              className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {processingRefund ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
