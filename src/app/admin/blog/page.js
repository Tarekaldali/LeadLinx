'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import BlockManager from '@/components/cms/BlockManager';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoSaveTimer = useRef(null);
  const articleRef = useRef(null);
  const heroInputRef = useRef(null);
  const authorInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Keep articleRef in sync for use in auto-save callbacks
  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  // ─── Data fetching ──────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/articles');
      const data = await res.json();
      const articles = data.articles || [];
      setPosts(articles);
      return articles;
    } catch {
      showToast('Failed to fetch posts', 'error');
      return [];
    }
  }, []);

  const fetchArticle = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/admin/cms/articles/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArticle(data.article);
      setSelectedPostId(id);
      setLastSaved(new Date());
      setSidebarOpen(false);
    } catch (error) {
      showToast('Failed to load article: ' + error.message, 'error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const articles = await fetchPosts();
      if (articles.length > 0) {
        await fetchArticle(articles[0]._id);
      }
      setLoading(false);
    })();
  }, [fetchPosts, fetchArticle]);

  // ─── Save logic ──────────────────────────────────────────────────
  const doSave = useCallback(async (currentArticle, id, status = null) => {
    if (!currentArticle || !id) return false;
    setSaving(true);
    try {
      const payload = { ...currentArticle };
      delete payload._id;
      if (status) payload.status = status;

      const res = await fetch(`/api/admin/cms/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setLastSaved(new Date());
      if (status) setArticle((prev) => ({ ...prev, status }));
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Manual save/publish
  const handleSave = async (status = null) => {
    const ok = await doSave(articleRef.current, selectedPostId, status);
    if (ok) {
      showToast(status === 'Published' ? '🎉 Article Published!' : '✅ Draft Saved');
      fetchPosts();
    }
  };

  // Auto-save to draft every 30s when there's unsaved changes
  const handleUpdate = (key, value) => {
    setArticle((prev) => ({ ...prev, [key]: value }));

    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (articleRef.current && selectedPostId) {
        doSave(articleRef.current, selectedPostId).then(() => {
          // Silently update last saved time - no toast for auto-save
        });
      }
    }, 3000); // auto-save 3s after last keystroke
  };

  // ─── New post ─────────────────────────────────────────────────────
  const createNewPost = async () => {
    try {
      const res = await fetch('/api/admin/cms/articles', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      await fetchPosts();
      await fetchArticle(data.articleId);
      showToast('New draft created');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────
  const confirmDelete = async () => {
    const idToDelete = showConfirmDelete;
    setShowConfirmDelete(null);
    try {
      const res = await fetch(`/api/admin/cms/articles/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Post deleted');
      const articles = await fetchPosts();
      if (idToDelete === selectedPostId) {
        if (articles.length > 0) {
          await fetchArticle(articles[0]._id);
        } else {
          setArticle(null);
          setSelectedPostId(null);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ─── Hero image upload ────────────────────────────────────────────
  const handleHeroImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast('Uploading image...');
      const res = await fetch('/api/admin/cms/media', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      handleUpdate('hero', { ...(article?.hero || {}), image: data.url });
      showToast('✅ Image uploaded');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (heroInputRef.current) heroInputRef.current.value = '';
    }
  };

  const handleAuthorImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast('Uploading image...');
      const res = await fetch('/api/admin/cms/media', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      handleUpdate('author', { ...(article?.author || {}), image: data.url });
      showToast('✅ Author image uploaded');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (authorInputRef.current) authorInputRef.current.value = '';
    }
  };

  // ─── Computed SEO score ───────────────────────────────────────────
  const seoScore = () => {
    if (!article) return 0;
    let score = 0;
    if ((article.title?.length || 0) > 10) score += 20;
    if ((article.seo?.metaTitle?.length || 0) >= 10) score += 20;
    if ((article.seo?.metaDescription?.length || 0) >= 50) score += 30;
    if ((article.excerpt?.length || 0) > 20) score += 15;
    if (article.hero?.image) score += 15;
    return score;
  };

  const score = seoScore();
  const scoreColor = score >= 75 ? 'text-green-700' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
  const scoreDot = score >= 75 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  // ─── Loading & empty states ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0 && !article) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-primary">article</span>
        </div>
        <h2 className="font-h2 text-h2 text-on-surface">No articles yet</h2>
        <p className="text-secondary max-w-sm">Create your first blog post to start building your content strategy.</p>
        <button onClick={createNewPost} className="btn-primary flex items-center gap-2 px-6 py-3">
          <span className="material-symbols-outlined">add</span>
          Create First Post
        </button>
      </div>
    );
  }

  // ─── Main editor UI ───────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-surface font-body-md overflow-hidden -m-6 -mt-4" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Hidden hero upload input */}
      <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
      <input ref={authorInputRef} type="file" accept="image/*" className="hidden" onChange={handleAuthorImageUpload} />

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="h-[52px] bg-surface-container-lowest border-b border-[#EEEEEE] px-4 flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-secondary hover:text-on-surface transition-colors text-sm font-medium bg-surface-container-low hover:bg-surface-container px-3 py-1.5 rounded-lg"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
            Posts
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-1.5 py-0.5 rounded-full">{posts.length}</span>
          </button>

          <nav className="hidden md:flex items-center text-secondary text-sm">
            <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
            <span className="text-on-surface font-medium truncate max-w-[220px]">{article?.title || 'New Post'}</span>
          </nav>

          {/* Save indicator */}
          <div className="ml-1 flex items-center gap-1 text-[12px] text-secondary bg-surface-container-low px-2 py-1 rounded-md">
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                <span>Saving…</span>
              </>
            ) : lastSaved ? (
              <>
                <span className="material-symbols-outlined text-[14px] text-green-600">cloud_done</span>
                <span className="text-green-700">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={createNewPost}
            className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm text-[12px] px-4 py-2 rounded-lg transition-all duration-300 hover:scale-[1.03] active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Draft
          </button>
          <div className="hidden md:flex items-center bg-surface-container-low rounded-lg p-[2px] border border-[#EEEEEE]">
            {['desktop', 'tablet', 'mobile'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPreviewMode(mode)}
                className={`w-7 h-7 rounded-md transition-colors flex items-center justify-center ${previewMode === mode ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-secondary hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {mode === 'desktop' ? 'desktop_windows' : mode === 'tablet' ? 'tablet_mac' : 'smartphone'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Sliding Posts Sidebar ────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div
            className="relative w-[340px] max-w-[85vw] bg-surface-container-lowest border-r border-[#EEEEEE] shadow-2xl h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#EEEEEE] flex items-center justify-between">
              <h3 className="font-semibold text-[17px] text-on-surface">All Posts</h3>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#EEEEEE] bg-surface-container-low/50">
              {[
                { label: 'Total', value: posts.length, color: 'text-on-surface' },
                { label: 'Published', value: posts.filter((p) => p.status === 'Published' || p.published).length, color: 'text-green-700' },
                { label: 'Drafts', value: posts.filter((p) => !(p.status === 'Published' || p.published)).length, color: 'text-yellow-700' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-[20px] font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-secondary uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {posts.map((post) => (
                <div
                  key={post._id}
                  className={`flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE]/60 cursor-pointer transition-colors group ${
                    selectedPostId === post._id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex-1 min-w-0 mr-3" onClick={() => fetchArticle(post._id)}>
                    <div className="font-medium text-on-surface text-sm truncate">{post.title || 'Untitled Article'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        (post.status === 'Published' || post.published) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(post.status === 'Published' || post.published) ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-[11px] text-secondary truncate">{post.category || 'General'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(post._id); }}
                    className="opacity-0 group-hover:opacity-100 text-secondary hover:text-error transition-all p-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete Article"
        type="danger"
      />

      {/* ── Editor Workspace ──────────────────────────────────────────── */}
      {article ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={`w-full mx-auto flex flex-col md:flex-row gap-6 p-6 transition-all duration-300 ${
              previewMode === 'mobile' ? 'max-w-[420px]' : previewMode === 'tablet' ? 'max-w-[800px]' : 'max-w-[1280px]'
            }`}
          >
            {/* ── LEFT: Main editor (75%) ───────────────────────────── */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">

              {/* Title */}
              <input
                type="text"
                placeholder="Post Title…"
                value={article.title || ''}
                onChange={(e) => handleUpdate('title', e.target.value)}
                className="w-full bg-transparent border-none outline-none font-h1 text-[28px] md:text-[36px] text-on-surface placeholder:text-secondary/30 focus:ring-0 p-0 leading-tight"
              />

              {/* Metadata card */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Slug</label>
                    <input
                      type="text"
                      value={article.slug || ''}
                      onChange={(e) => handleUpdate('slug', e.target.value)}
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Category</label>
                    <select
                      value={article.category || 'General'}
                      onChange={(e) => handleUpdate('category', e.target.value)}
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface appearance-none"
                    >
                      {['General', 'Strategy', 'Growth Strategy', 'Tools', 'Growth', 'Product Updates', 'Tutorial', 'Industry News', 'AI', 'SEO', 'SaaS', 'Automation'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Read Time (mins)</label>
                    <input
                      type="number"
                      min="1"
                      value={article.readTime || ''}
                      onChange={(e) => handleUpdate('readTime', parseInt(e.target.value) || 8)}
                      placeholder="8"
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 min-h-[42px] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                      {(article.tags || []).map((tag, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleUpdate('tags', (article.tags || []).filter((_, idx) => idx !== i))}
                            className="hover:text-error transition-colors ml-0.5"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Add tag…"
                        className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-secondary/40"
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) {
                            e.preventDefault();
                            handleUpdate('tags', [...(article.tags || []), e.target.value.trim()]);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Block Canvas */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5 md:pl-12">
                <BlockManager
                  blocks={article.blocks || []}
                  onChange={(newBlocks) => handleUpdate('blocks', newBlocks)}
                />
              </div>

              <div className="h-20" />
            </div>

            {/* ── RIGHT: Sidebar (25%) ───────────────────────────────── */}
            <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col gap-5">

              {/* Publish Card */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-[16px] text-on-surface">Publish</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                    article.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {article.status || 'Draft'}
                  </span>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-[13px] py-2 border-b border-[#EEEEEE]">
                    <span className="text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">visibility</span> Visibility
                    </span>
                    <span className="text-primary font-semibold">Public</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] py-2 border-b border-[#EEEEEE]">
                    <span className="text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span> Publish
                    </span>
                    <span className="text-primary font-semibold">Immediately</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave('Published')}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-semibold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">publish</span>
                    )}
                    Publish Post
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave('Draft')}
                    disabled={saving}
                    className="w-full bg-surface border border-[#EEEEEE] text-on-surface font-semibold py-3 rounded-xl transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    Save Draft
                  </button>
                </div>
              </div>

              {/* Featured Image Card */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-[16px] text-on-surface">Featured Image</span>
                  {article.hero?.image && (
                    <button
                      type="button"
                      onClick={() => handleUpdate('hero', { ...(article.hero || {}), image: '' })}
                      className="text-[12px] text-error hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {article.hero?.image ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#EEEEEE] group/hero mb-3">
                    <img src={article.hero.image} alt="Hero" className="w-full h-auto object-cover max-h-[160px] block" />
                    <label className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/hero:opacity-100 cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                      <span className="bg-white text-on-surface text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                        Replace
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#EEEEEE] rounded-xl p-8 flex flex-col items-center justify-center bg-surface hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer group mb-3 relative">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleHeroImageUpload} />
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-primary text-[24px]">image</span>
                    </div>
                    <span className="font-semibold text-on-surface text-sm">Click to upload</span>
                    <span className="text-secondary text-xs mt-1">or drag and drop</span>
                  </label>
                )}

                <div>
                  <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Alt Text</label>
                  <input
                    type="text"
                    value={article.hero?.alt || ''}
                    onChange={(e) => handleUpdate('hero', { ...(article.hero || {}), alt: e.target.value })}
                    placeholder="Describe the image for SEO…"
                    className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>
              </div>

              {/* Author Details Card */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <span className="font-semibold text-[16px] text-on-surface block mb-4">Author Details</span>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-[#EEEEEE] overflow-hidden relative bg-surface-container flex-shrink-0 group cursor-pointer" onClick={() => authorInputRef.current?.click()}>
                      {article.author?.image ? (
                        <img src={article.author.image} alt="Author" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[20px]">person</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[16px]">edit</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Name</label>
                      <input
                        type="text"
                        value={article.author?.name || ''}
                        onChange={(e) => handleUpdate('author', { ...(article.author || {}), name: e.target.value })}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Role</label>
                    <input
                      type="text"
                      value={article.author?.role || ''}
                      onChange={(e) => handleUpdate('author', { ...(article.author || {}), role: e.target.value })}
                      placeholder="e.g. Content Strategist"
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Bio</label>
                    <textarea
                      value={article.author?.bio || ''}
                      onChange={(e) => handleUpdate('author', { ...(article.author || {}), bio: e.target.value })}
                      placeholder="Short author biography..."
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface resize-none h-[64px]"
                    />
                  </div>
                </div>
              </div>

              {/* SEO Panel */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-[16px] text-on-surface">SEO Meta</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${scoreDot}`} />
                    <span className={`text-[12px] font-bold ${scoreColor}`}>{score}/100</span>
                  </div>
                </div>

                {/* SEO Score bar */}
                <div className="w-full h-1.5 bg-surface-container rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${score >= 75 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                {/* Google SERP preview */}
                <div className="bg-surface border border-[#EEEEEE] rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-secondary uppercase tracking-widest mb-2 font-semibold">Google Preview</p>
                  <p className="text-[#1a0dab] text-[15px] font-medium truncate leading-tight hover:underline cursor-pointer">
                    {article.seo?.metaTitle || article.title || 'Untitled'} | LeadLinx
                  </p>
                  <p className="text-[#006621] text-[12px] mb-1">https://leadlinx.com/blog/{article.slug || 'your-slug'}</p>
                  <p className="text-[#545454] text-[12px] leading-snug line-clamp-2">
                    {article.seo?.metaDescription || article.excerpt || 'Add a meta description to improve click-through rates…'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-secondary uppercase tracking-widest font-semibold">Meta Title</label>
                      <span className={`text-[10px] ${(article.seo?.metaTitle?.length || 0) > 60 ? 'text-red-500' : 'text-secondary'}`}>
                        {article.seo?.metaTitle?.length || 0}/60
                      </span>
                    </div>
                    <input
                      type="text"
                      value={article.seo?.metaTitle || ''}
                      onChange={(e) => handleUpdate('seo', { ...(article.seo || {}), metaTitle: e.target.value })}
                      placeholder="Page title for search engines…"
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-secondary uppercase tracking-widest font-semibold">Meta Description</label>
                      <span className={`text-[10px] ${(article.seo?.metaDescription?.length || 0) > 160 ? 'text-red-500' : 'text-secondary'}`}>
                        {article.seo?.metaDescription?.length || 0}/160
                      </span>
                    </div>
                    <textarea
                      value={article.seo?.metaDescription || ''}
                      onChange={(e) => handleUpdate('seo', { ...(article.seo || {}), metaDescription: e.target.value })}
                      placeholder="Description shown in search results…"
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface resize-none h-[80px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Excerpt</label>
                    <textarea
                      value={article.excerpt || ''}
                      onChange={(e) => handleUpdate('excerpt', e.target.value)}
                      placeholder="Short summary for blog listing cards…"
                      className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface resize-none h-[64px]"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Widgets */}
              <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-2xl shadow-sm p-5">
                <span className="font-semibold text-[16px] text-on-surface block mb-4">Sidebar Widgets</span>
                <div className="space-y-3">
                  {[
                    { key: 'popularPosts', label: 'Popular Posts' },
                    { key: 'newsletter', label: 'Newsletter Signup' },
                    { key: 'ctaCard', label: 'CTA Card' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer text-sm group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={article.sidebar?.[key] ?? true}
                          onChange={(e) => handleUpdate('sidebar', { ...(article.sidebar || {}), [key]: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${(article.sidebar?.[key] ?? true) ? 'bg-primary' : 'bg-surface-container-high'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${(article.sidebar?.[key] ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                      <span className="text-on-surface">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-secondary">
            <span className="material-symbols-outlined text-[48px] block mb-3 opacity-30">article</span>
            <p>Select a post from the sidebar or create a new one.</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all ${
          toast.type === 'error' ? 'bg-error text-on-error' : 'bg-inverse-surface text-inverse-on-surface'
        }`}>
          {toast.type === 'error' && <span className="material-symbols-outlined text-[18px]">error</span>}
          {toast.message}
        </div>
      )}
    </div>
  );
}
