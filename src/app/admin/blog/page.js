'use client';
import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/Modal';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    slug: '',
    category: 'Strategy',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      showToast('Failed to fetch posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingPost
        ? `/api/admin/blog/${editingPost._id}`
        : '/api/admin/blog';
      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      showToast(editingPost ? 'Post updated!' : 'Post created!');
      resetForm();
      fetchPosts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/admin/blog/${showConfirmDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Post deleted');
      fetchPosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const res = await fetch(`/api/admin/blog/${post._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!res.ok) throw new Error('Failed to update');
      showToast(post.published ? 'Post unpublished' : 'Post published');
      fetchPosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content || '',
      image: post.image || '',
      slug: post.slug,
      category: post.category || 'Strategy',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingPost(null);
    setFormData({ title: '', content: '', image: '', slug: '', category: 'Strategy' });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="skeleton w-full h-96"></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline mb-2 text-on-surface">Blog Management</h1>
          <p className="text-on-surface-variant font-body">Create, edit, and manage blog posts.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Blog Post
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Posts</div>
          <div className="stat-value">{posts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Published</div>
          <div className="stat-value text-lime-green">{posts.filter(p => p.published).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Drafts</div>
          <div className="stat-value text-tertiary">{posts.filter(p => !p.published).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categories</div>
          <div className="stat-value">{new Set(posts.map(p => p.category)).size}</div>
        </div>
      </div>

      {/* Modal Form */}
      <Modal 
        isOpen={showModal} 
        onClose={resetForm} 
        title={editingPost ? 'Edit Blog Post' : 'Create New Post'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Article Title</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-slate-800 placeholder:text-slate-400"
                placeholder="e.g. How to scale your Reddit leads"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">URL Slug</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-slate-800 placeholder:text-slate-400"
                placeholder="how-to-scale-leads"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Category</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-slate-800 bg-white"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option>Strategy</option>
                <option>Tools</option>
                <option>Growth</option>
                <option>Tutorial</option>
                <option>General</option>
              </select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Featured Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 flex items-center gap-2 text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
               <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Content Editor</label>
               <span className="text-[10px] text-slate-400 font-medium italic">Markdown supported</span>
            </div>
            <textarea
              className="w-full px-3.5 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm transition-all text-slate-800 min-h-[300px] font-mono leading-relaxed"
              placeholder="Write your article content here..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">{editingPost ? 'done_all' : 'publish'}</span>
                  {editingPost ? 'Save Changes' : 'Publish Article'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>



      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This action cannot be undone."
        confirmText="Delete Post"
        type="danger"
      />

      {/* Posts Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <div className="font-medium text-on-surface text-sm">{post.title}</div>
                  </td>
                  <td>
                    <span className="badge badge-growth">{post.category}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`badge cursor-pointer ${post.published ? 'badge-growth' : 'badge-starter'}`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="text-xs font-data-label text-on-surface-variant">
                    {post.date ? new Date(post.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(post)} className="btn-ghost text-xs py-1 px-2"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                      <button onClick={() => setShowConfirmDelete(post._id)} className="btn-ghost text-xs py-1 px-2 text-hot-pink"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
