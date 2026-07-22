'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import BlockManager from '@/components/cms/BlockManager';

export default function EditorPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const res = await fetch(`/api/admin/cms/articles/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArticle(data.article);
    } catch (error) {
      showToast('Failed to load article', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status = null) => {
    setSaving(true);
    try {
      const updateData = { ...article };
      if (status) {
        updateData.status = status;
      }
      const res = await fetch(`/api/admin/cms/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (status) setArticle(prev => ({ ...prev, status }));
      showToast(status === 'Published' ? 'Article Published!' : 'Draft Saved');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading...', 'info');
      const res = await fetch('/api/admin/cms/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      handleUpdate('hero', { ...article.hero, image: data.url });
      showToast('Image uploaded');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdate = (key, value) => {
    setArticle(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!article) return <div className="p-8 text-center text-on-surface">Article not found</div>;

  return (
    <div className="flex flex-col h-screen bg-surface font-body-md overflow-hidden fixed inset-0 z-50">
      {/* Top App Bar / Document Header */}
      <header className="h-[72px] bg-surface-container-lowest border-b border-[#EEEEEE] px-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-sm">
          {/* Breadcrumbs */}
          <nav className="flex items-center text-secondary font-body-md">
            <button onClick={() => router.push('/admin')} className="hover:text-primary transition-colors">Admin</button>
            <span className="material-symbols-outlined text-[16px] mx-xs">chevron_right</span>
            <button onClick={() => router.push('/admin/blog')} className="hover:text-primary transition-colors">Blog</button>
            <span className="material-symbols-outlined text-[16px] mx-xs">chevron_right</span>
            <span className="text-on-surface font-medium truncate max-w-[200px]">{article.title || 'New Post'}</span>
          </nav>
          
          {/* Auto-save indicator */}
          {saving && (
            <div className="ml-lg flex items-center gap-xs text-secondary-fixed-dim font-label-sm bg-surface-container-low px-xs py-[2px] rounded">
              <div className="w-3 h-3 border-2 border-secondary-fixed-dim border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </div>
          )}
          {!saving && (
            <div className="ml-lg flex items-center gap-xs text-secondary-fixed-dim font-label-sm bg-surface-container-low px-xs py-[2px] rounded">
              <span className="material-symbols-outlined text-[14px]">cloud_done</span>
              Saved
            </div>
          )}
        </div>

        {/* Preview Switcher */}
        <div className="flex items-center bg-surface-container-low rounded-lg p-[2px] border border-[#EEEEEE]">
          {['desktop', 'tablet', 'mobile'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`w-8 h-8 rounded-md transition-colors flex items-center justify-center ${previewMode === mode ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-secondary hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {mode === 'desktop' ? 'desktop_windows' : mode === 'tablet' ? 'tablet_mac' : 'smartphone'}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Editor Workspace (75/25 Split) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center">
        <div className={`w-full ${previewMode === 'mobile' ? 'max-w-[400px]' : previewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-container-max'} flex flex-col md:flex-row gap-lg p-lg transition-all duration-300`}>
          
          {/* Left Column (Main Editor - 75%) */}
          <div className="flex-1 flex flex-col gap-lg max-w-[800px]">
            
            {/* Title Input */}
            <div>
              <input 
                type="text" 
                placeholder="Post Title..." 
                value={article.title}
                onChange={(e) => handleUpdate('title', e.target.value)}
                className="w-full bg-transparent border-none outline-none font-h1 text-[32px] md:text-h1 text-on-surface placeholder:text-secondary-fixed-dim focus:ring-0 p-0" 
              />
            </div>

            {/* Basic Info Card */}
            <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-xl shadow-soft p-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-sm text-secondary mb-xs">Slug</label>
                  <input 
                    type="text" 
                    value={article.slug} 
                    onChange={(e) => handleUpdate('slug', e.target.value)}
                    className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[10px] font-body-md focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-xs">Category</label>
                  <select 
                    value={article.category} 
                    onChange={(e) => handleUpdate('category', e.target.value)}
                    className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[10px] font-body-md focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5e5e%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                  >
                    <option>Strategy</option>
                    <option>Product Updates</option>
                    <option>Tutorial</option>
                    <option>Industry News</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block font-label-sm text-secondary mb-xs">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    value={(article.tags || []).join(', ')} 
                    onChange={(e) => handleUpdate('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="B2B, SaaS, Growth..."
                    className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[10px] font-body-md focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Visual Block Builder Canvas */}
            <div className="flex flex-col relative mt-lg">
              <BlockManager 
                blocks={article.blocks || []} 
                onChange={(newBlocks) => handleUpdate('blocks', newBlocks)} 
              />
            </div>
            
            <div className="h-32"></div> {/* Spacer for scrolling */}
          </div>

          {/* Right Column (Utility Sidebar - 25%) */}
          <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col gap-md">
            
            {/* Publishing Card */}
            <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-xl shadow-soft p-md flex flex-col gap-sm">
              <div className="flex items-center justify-between mb-xs">
                <span className="font-h3 text-[18px] text-on-surface">Publish</span>
                <span className={`px-2 py-1 rounded font-label-sm text-[11px] uppercase tracking-wider ${article.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-surface-container-low text-secondary'}`}>
                  {article.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm py-xs border-b border-[#EEEEEE]">
                <span className="text-secondary font-body-md flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">visibility</span> Visibility</span>
                <button className="text-primary font-medium hover:underline">Public</button>
              </div>
              
              <div className="flex items-center justify-between text-sm py-xs border-b border-[#EEEEEE]">
                <span className="text-secondary font-body-md flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> Publish</span>
                <button className="text-primary font-medium hover:underline">Immediately</button>
              </div>

              <div className="flex flex-col gap-xs mt-sm">
                <button 
                  onClick={() => handleSave('Published')}
                  className="w-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm py-[12px] rounded-lg transition-colors shadow-sm text-center"
                >
                  Publish Post
                </button>
                <button 
                  onClick={() => handleSave('Draft')}
                  className="w-full bg-surface-container-lowest border border-on-surface text-on-surface font-label-sm py-[12px] rounded-lg transition-colors hover:bg-surface-container-low text-center"
                >
                  Save Draft
                </button>
              </div>
            </div>

            {/* Featured Image Card */}
            <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-xl shadow-soft p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className="font-h3 text-[18px] text-on-surface">Featured Image</span>
                {article.hero?.image && (
                   <button onClick={() => handleUpdate('hero', { ...article.hero, image: '' })} className="text-[12px] text-error hover:underline">Remove</button>
                )}
              </div>
              
              {article.hero?.image ? (
                <div className="relative rounded-lg overflow-hidden border border-[#EEEEEE] group mb-2">
                  <img src={article.hero.image} alt="Hero" className="w-full h-auto object-cover max-h-[200px]" />
                </div>
              ) : (
                <div 
                  onClick={() => document.getElementById('hero-upload').click()}
                  className="border-2 border-dashed border-[#EEEEEE] rounded-lg p-lg flex flex-col items-center justify-center bg-surface-bright hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-xs group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">image</span>
                  </div>
                  <span className="font-label-sm text-on-surface">Click to upload</span>
                  <span className="font-body-md text-sm text-secondary mt-1">or drag and drop</span>
                  <input type="file" id="hero-upload" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                </div>
              )}
              
              <div>
                <label className="block font-label-sm text-secondary mb-xs mt-xs">Alt Text</label>
                <input 
                  type="text" 
                  value={article.hero?.alt || ''}
                  onChange={(e) => handleUpdate('hero', { ...article.hero, alt: e.target.value })}
                  placeholder="Describe the image..." 
                  className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[8px] font-body-md text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface"
                />
              </div>
            </div>

            {/* SEO & Social Panel */}
            <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-xl shadow-soft p-md flex flex-col gap-sm">
              <div className="flex items-center justify-between">
                <span className="font-h3 text-[18px] text-on-surface">SEO Meta</span>
                {/* SEO Score Meter */}
                <div className="flex items-center gap-1" title="SEO Score">
                  <div className={`w-2 h-2 rounded-full ${(article.seo?.metaTitle?.length > 10 && article.seo?.metaDescription?.length > 50) ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className={`font-label-sm ${(article.seo?.metaTitle?.length > 10 && article.seo?.metaDescription?.length > 50) ? 'text-green-700' : 'text-yellow-700'}`}>
                    {(article.seo?.metaTitle?.length > 10 && article.seo?.metaDescription?.length > 50) ? '85/100' : 'Needs Work'}
                  </span>
                </div>
              </div>

              {/* Google Preview snippet */}
              <div className="bg-surface p-sm rounded border border-[#EEEEEE] mt-xs">
                <p className="text-[12px] text-secondary mb-1">Google Preview</p>
                <p className="text-[#1a0dab] text-[18px] font-body-md truncate leading-tight hover:underline cursor-pointer">
                  {article.seo?.metaTitle || article.title || 'Untitled'} | LeadLinx
                </p>
                <p className="text-[#006621] text-[13px] mb-1">https://leadlinx.com/blog/{article.slug}</p>
                <p className="text-[#545454] text-[13px] leading-snug line-clamp-2">
                  {article.seo?.metaDescription || article.excerpt || 'Provide a meta description to see it here...'}
                </p>
              </div>
              
              <div className="mt-xs">
                <div className="flex items-center justify-between mb-xs">
                  <label className="block font-label-sm text-secondary">Meta Title</label>
                  <span className="text-[11px] text-secondary">{article.seo?.metaTitle?.length || 0}/60 chars</span>
                </div>
                <input 
                  type="text" 
                  value={article.seo?.metaTitle || ''}
                  onChange={(e) => handleUpdate('seo', { ...article.seo, metaTitle: e.target.value })}
                  placeholder="Meta title..."
                  className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[8px] font-body-md text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface" 
                />
              </div>
              
              <div className="">
                <div className="flex items-center justify-between mb-xs">
                  <label className="block font-label-sm text-secondary">Meta Description</label>
                  <span className="text-[11px] text-secondary">{article.seo?.metaDescription?.length || 0}/160 chars</span>
                </div>
                <textarea 
                  value={article.seo?.metaDescription || ''}
                  onChange={(e) => handleUpdate('seo', { ...article.seo, metaDescription: e.target.value })}
                  placeholder="Meta description..."
                  className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[8px] font-body-md text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface resize-none h-[80px]"
                />
              </div>
              
              <div className="mt-xs">
                <label className="block font-label-sm text-secondary mb-xs">Excerpt (Short Description)</label>
                <textarea 
                  value={article.excerpt || ''}
                  onChange={(e) => handleUpdate('excerpt', e.target.value)}
                  placeholder="Short excerpt for blog listing..."
                  className="w-full bg-surface-bright border border-[#EEEEEE] rounded-lg px-sm py-[8px] font-body-md text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface resize-none h-[60px]"
                />
              </div>
            </div>

            {/* Sidebar Widgets Toggle */}
            <div className="bg-surface-container-lowest border border-[#EEEEEE] rounded-xl shadow-soft p-md flex flex-col gap-sm">
              <span className="font-h3 text-[18px] text-on-surface">Sidebar Layout</span>
              <div className="space-y-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer font-body-md text-sm">
                  <input type="checkbox" checked={article.sidebar?.popularPosts} onChange={(e) => handleUpdate('sidebar', { ...article.sidebar, popularPosts: e.target.checked })} /> Popular Posts Widget
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-body-md text-sm">
                  <input type="checkbox" checked={article.sidebar?.newsletter} onChange={(e) => handleUpdate('sidebar', { ...article.sidebar, newsletter: e.target.checked })} /> Newsletter Signup
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-body-md text-sm">
                  <input type="checkbox" checked={article.sidebar?.ctaCard} onChange={(e) => handleUpdate('sidebar', { ...article.sidebar, ctaCard: e.target.checked })} /> CTA Card
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded shadow-hover font-semibold text-sm ${toast.type === 'error' ? 'bg-error text-on-error' : 'bg-inverse-surface text-inverse-on-surface'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
