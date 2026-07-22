'use client';
export default function HtmlBlock({ content, onChange }) {
  return (
    <div className="w-full border border-[#EEEEEE] rounded-xl bg-surface-container-lowest overflow-hidden shadow-sm">
      <div className="p-2 bg-inverse-surface flex items-center justify-between">
        <span className="font-mono text-xs text-inverse-on-surface ml-2">Custom HTML / Embed</span>
      </div>
      <textarea 
        className="w-full h-48 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 border-none outline-none resize-y"
        placeholder="<div>Your custom HTML here...</div>"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
      />
    </div>
  );
}
