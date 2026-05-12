'use client';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-mask">
      <div className="modal-wrapper" onClick={onClose}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <header className="px-8 py-5 border-b border-border-glass flex justify-between items-center bg-surface shrink-0">
            <h2 className="text-lg font-bold text-on-surface tracking-tight">{title}</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
              title="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          
          <div className="modal-body-scroll">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
