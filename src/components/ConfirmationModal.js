'use client';
import './Modal.css';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'info' }) {
  if (!isOpen) return null;

  const themes = {
    danger: {
      icon: 'warning',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      actionBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    },
    success: {
      icon: 'check_circle',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      actionBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    },
    info: {
      icon: 'info',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
      actionBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm',
    }
  };

  const theme = themes[type] || themes.info;

  return (
    <div className="modal-mask">
      <div className="modal-wrapper" onClick={onClose}>
        <div className="modal-container modal-confirm-container mx-auto" onClick={e => e.stopPropagation()}>
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* Refined Icon Block */}
              <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center mb-5`}>
                <span className={`material-symbols-outlined text-[28px] ${theme.iconColor}`}>{theme.icon}</span>
              </div>

              {/* Text Block */}
              <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">
                {message}
              </p>
            </div>

            {/* Actions Area */}
            <div className="mt-8 flex flex-col gap-2">
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${theme.actionBtn}`}
              >
                {confirmText}
              </button>
              <button 
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
