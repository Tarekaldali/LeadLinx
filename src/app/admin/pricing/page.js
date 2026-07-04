'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function AdminPricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    period: 'Monthly',
    description: '',
    features: '',
    cta: 'Get Started',
    ctaHref: '/signup',
    highlight: false,
    badge: ''
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      setPlans(data || []);
    } catch {
      showToast('Failed to fetch plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      period: plan.period || 'Monthly',
      description: plan.description || '',
      features: Array.isArray(plan.features) ? plan.features.join('\n') : plan.features,
      cta: plan.cta || 'Get Started',
      ctaHref: plan.ctaHref || '/signup',
      highlight: plan.highlight || false,
      badge: plan.badge || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingPlan ? 'PUT' : 'POST';
      const body = {
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim() !== ''),
        id: editingPlan?._id
      };

      const res = await fetch('/api/admin/pricing', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save plan');

      showToast(editingPlan ? 'Plan updated!' : 'Plan created!');
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/admin/pricing?id=${showConfirmDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete plan');
      showToast('Plan deleted');
      fetchPlans();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      period: 'Monthly',
      description: '',
      features: '',
      cta: 'Get Started',
      ctaHref: '/signup',
      highlight: false,
      badge: ''
    });
  };

  if (loading) return <div className="skeleton w-full h-96"></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">Pricing Management</h1>
          <p className="text-on-surface-variant font-body">Manage subscription plans and features.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Pricing Plan
        </button>
      </header>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Features</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan._id}>
                  <td>
                    <div className="font-medium text-on-surface text-sm">{plan.name}</div>
                    {plan.badge && <span className="text-[10px] font-data-label bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{plan.badge}</span>}
                  </td>
                  <td>
                    <div className="font-data-value">{plan.price}</div>
                    <div className="text-xs text-on-surface-variant">{plan.period}</div>
                  </td>
                  <td>
                    {plan.highlight ? (
                      <span className="badge badge-growth">Highlighted</span>
                    ) : (
                      <span className="badge badge-starter">Standard</span>
                    )}
                  </td>
                  <td className="text-xs text-on-surface-variant">
                    {plan.features?.length || 0} features
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(plan)} className="btn-ghost text-xs py-1 px-2" title="Edit">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => setShowConfirmDelete(plan._id)} className="btn-ghost text-xs py-1 px-2 text-hot-pink" title="Delete">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingPlan ? 'Edit Pricing Plan' : 'Create New Plan'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Section */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-0.5">Plan Name</label>
              <input 
                type="text" className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface placeholder:text-on-surface-variant opacity-60" 
                placeholder="e.g. Professional"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required
              />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-0.5">Price</label>
              <input 
                type="text" className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface placeholder:text-on-surface-variant opacity-60" 
                placeholder="$7.99"
                value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required
              />
            </div>

            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-0.5">Billing Period</label>
              <select 
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface bg-background opacity-80" 
                value={formData.period} 
                onChange={e => setFormData({...formData, period: e.target.value})}
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-0.5">Badge (Optional)</label>
              <input 
                type="text" className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface placeholder:text-on-surface-variant opacity-60" 
                placeholder="Most Popular"
                value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-0.5">Short Description</label>
            <input 
              type="text" className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface placeholder:text-on-surface-variant opacity-60" 
              placeholder="A brief summary for the card header"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Features</label>
              <span className="text-[10px] text-on-surface-variant opacity-60 font-medium">One feature per line</span>
            </div>
            <textarea 
              className="w-full px-3.5 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-on-surface min-h-[120px] resize-y" 
              placeholder="400 Credits / month&#10;Advanced Scoring&#10;Email Alerts..."
              value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-surface-container-highest select-none cursor-pointer" onClick={() => setFormData({...formData, highlight: !formData.highlight})}>
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${formData.highlight ? 'bg-primary border-primary' : 'bg-surface border-outline-variant'}`}>
               {formData.highlight && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface leading-none">Promote Plan</span>
              <span className="text-[11px] text-on-surface-variant mt-1">Add a highlight border and shadow to attract attention</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-container-highest">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg text-sm font-bold bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-all shadow-sm flex items-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">{editingPlan ? 'done_all' : 'add'}</span>
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>



      <ConfirmationModal 
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Pricing Plan"
        message="Are you sure you want to delete this pricing plan? This action cannot be undone."
        confirmText="Delete Plan"
        type="danger"
      />

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
