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
      iconBg: 'bg-surface-container-low',
      iconColor: 'text-on-surface-variant',
      actionBtn: 'bg-on-surface text-surface hover:opacity-90 shadow-sm',
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
              <h3 className="text-xl font-bold text-on-surface mb-3 tracking-tight">{title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-[280px]">
                {message}
              </p>
            </div>

            {/* Actions Area */}
            <div className="mt-8 flex flex-col gap-2">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfirm();
                  onClose();
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${theme.actionBtn}`}
              >
                {confirmText}
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all active:scale-[0.98]"
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
