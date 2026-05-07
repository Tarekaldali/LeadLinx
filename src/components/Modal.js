'use client';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-mask">
      <div className="modal-wrapper" onClick={onClose}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
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
