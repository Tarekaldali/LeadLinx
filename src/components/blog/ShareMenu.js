"use client";
import { useState, useRef, useEffect } from 'react';

export default function ShareMenu({ url, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = {
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleShare}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#EEEEEE] bg-surface text-secondary hover:border-primary hover:text-primary transition-colors"
        title="Share"
      >
        <span className="material-symbols-outlined text-[18px]">share</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-[#EEEEEE] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <button 
            onClick={copyLink}
            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'link'}</span>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <a 
            href={shareLinks.x} target="_blank" rel="noopener noreferrer"
            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            Share on X
          </a>
          <a 
            href={shareLinks.reddit} target="_blank" rel="noopener noreferrer"
            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">forum</span>
            Share on Reddit
          </a>
          <a 
            href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer"
            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Share on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
