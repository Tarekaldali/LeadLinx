'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

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

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket._id}>
                  <td>
                    <div className="font-medium text-on-surface text-sm">{ticket.name}</div>
                    <div className="text-xs text-on-surface-variant">{ticket.email}</div>
                  </td>
                  <td className="font-medium text-sm text-on-surface max-w-[200px] truncate" title={ticket.subject}>
                    {ticket.subject}
                  </td>
                  <td className="max-w-[300px] truncate text-sm text-on-surface-variant" title={ticket.message}>
                    {ticket.message}
                  </td>
                  <td>
                    {ticket.status === 'Responded/Resolved' ? (
                      <span className="badge badge-growth">Resolved</span>
                    ) : (
                      <span className="badge badge-error">Open</span>
                    )}
                  </td>
                  <td className="text-sm text-on-surface-variant">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {ticket.status !== 'Responded/Resolved' && (
                      <button 
                        onClick={() => setReplyingTo(ticket)} 
                        className="btn-ghost text-xs py-1 px-3 text-primary border border-primary/20 hover:bg-primary hover:text-white"
                      >
                        Reply
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-on-surface-variant">
                    No support tickets found.
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

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
