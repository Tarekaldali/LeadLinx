'use client';
import { useState, useEffect, useRef } from 'react';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
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

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' });
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
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPost(null);
    setFormData({ title: '', content: '', image: '', slug: '', category: 'Strategy' });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 data URL for simple storage
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
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create Blog Post
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

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bento-card p-6 md:p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-xl text-on-surface">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </h2>
            <button onClick={resetForm} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">TITLE</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Blog post title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">SLUG (AUTO-GENERATED IF EMPTY)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="my-blog-post-title"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">CATEGORY</label>
                <select
                  className="input-field"
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
              <div className="space-y-2">
                <label className="text-xs font-data-label text-on-surface-variant">IMAGE</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Image URL or upload file"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ghost px-3 shrink-0"
                    title="Upload image"
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {formData.image && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-surface-container-low mt-2">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-data-label text-on-surface-variant">CONTENT</label>
              <textarea
                className="input-field min-h-[300px] resize-y font-mono text-sm"
                placeholder="Write your blog post content here..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">{editingPost ? 'save' : 'add'}</span>
                    {editingPost ? 'Update Post' : 'Publish Post'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

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
                    <div className="flex items-center gap-3">
                      {post.image && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-low shrink-0">
                          <img src={post.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-on-surface text-sm">{post.title}</div>
                        <div className="text-xs text-on-surface-variant font-data-label">/blog/{post.slug}</div>
                      </div>
                    </div>
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
                      <button
                        onClick={() => handleEdit(post)}
                        className="btn-ghost text-xs py-1 px-2"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="btn-ghost text-xs py-1 px-2 text-hot-pink hover:text-hot-pink"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl block mb-2">article</span>
                    No blog posts yet. Create your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
