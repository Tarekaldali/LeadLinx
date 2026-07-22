'use client';
import { useState, useRef } from 'react';

export default function ImageBlock({ content, onChange, blockId }) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 4.5MB for Vercel functions)
    if (file.size > 4.5 * 1024 * 1024) {
      setErrorMsg('File too large (max 4.5MB)');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/cms/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange({ ...content, url: data.url });
    } catch (err) {
      setErrorMsg('Failed to upload media');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full relative">
      {errorMsg && (
        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-[#dc2626] text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMsg}
        </div>
      )}
      {!content?.url ? (
        <label className="w-full border-2 border-dashed border-primary/30 rounded-xl p-10 flex flex-col items-center justify-center bg-surface hover:bg-primary/5 transition-colors cursor-pointer group relative">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleUpload}
          />
          {uploading ? (
            <>
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-secondary text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-[28px]">add_photo_alternate</span>
              </div>
              <span className="font-semibold text-on-surface mb-1">Click to upload image</span>
              <span className="text-secondary text-sm">PNG, JPG, WebP up to 10MB</span>
            </>
          )}
        </label>
      ) : (
        <div className="rounded-xl overflow-hidden border border-[#EEEEEE] shadow-sm">
          <div className="relative group/img">
            <img
              src={content.url}
              alt={content.alt || 'Content Image'}
              className="w-full h-auto object-cover max-h-[500px] block"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors" />
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
              <label className="bg-white/95 text-on-surface px-3 py-1.5 rounded-lg shadow-md hover:bg-white flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                Replace
              </label>
              <button
                type="button"
                onClick={() => onChange({ ...content, url: '' })}
                className="bg-error text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-red-700 flex items-center gap-1.5 text-sm font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Remove
              </button>
            </div>
          </div>
          <div className="bg-surface-container-lowest border-t border-[#EEEEEE] p-3 flex gap-3">
            <input
              type="text"
              placeholder="Alt text (for SEO accessibility)"
              value={content.alt || ''}
              onChange={(e) => onChange({ ...content, alt: e.target.value })}
              className="flex-1 text-sm text-on-surface bg-transparent border border-[#EEEEEE] focus:border-primary px-3 py-2 rounded-lg outline-none transition-colors"
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={content.caption || ''}
              onChange={(e) => onChange({ ...content, caption: e.target.value })}
              className="flex-1 text-sm text-on-surface bg-transparent border border-[#EEEEEE] focus:border-primary px-3 py-2 rounded-lg outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
