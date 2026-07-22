'use client';
import { useRef, useEffect } from 'react';

export default function HeadingBlock({ type, content, onChange }) {
  const contentEditableRef = useRef(null);

  // Determine styles based on heading type
  const styles = {
    h2: "font-h2 text-[32px] font-semibold leading-tight text-on-surface",
    h3: "font-h3 text-[24px] font-semibold leading-snug text-on-surface",
    h4: "font-h3 text-[20px] font-semibold leading-snug text-on-surface",
  };

  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerText !== content) {
      contentEditableRef.current.innerText = content;
    }
  }, [content]);

  const handleInput = () => {
    onChange(contentEditableRef.current.innerText);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="relative w-full">
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-surface-container-low text-secondary-fixed-dim text-[10px] font-bold px-1 py-0.5 rounded uppercase font-mono hidden md:block">
        {type}
      </div>
      <div
        ref={contentEditableRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className={`w-full outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-outline-variant cursor-text ${styles[type]}`}
        data-placeholder={`Heading ${type.replace('h', '')}...`}
      />
    </div>
  );
}
