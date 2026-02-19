import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
  customContent?: React.ReactNode;
  disabled?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'red',
  customContent,
  disabled = false
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    green: 'bg-green-600 hover:bg-green-700 shadow-green-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{title}</h3>
          </div>

          <div className="mb-4 leading-relaxed text-sm" style={{ color: 'var(--text)', opacity: 0.8 }}>
            {message}
          </div>

          {customContent && (
            <div className="mb-6">
              {customContent}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={disabled}
              className={`px-5 py-2.5 rounded-xl text-white font-bold shadow-md transition-all ${colorClasses[confirmColor]} ${disabled ? 'opacity-30 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
