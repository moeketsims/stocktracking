import { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '../ui';

type ConfirmationType = 'danger' | 'warning' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  isLoading?: boolean;
}

const typeConfig: Record<ConfirmationType, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; buttonColor: string }> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
}: ConfirmationModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-white rounded-xl shadow-xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="px-6 py-8 text-center">
            <div className={`mx-auto w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mb-4`}>
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>

            <p className="text-gray-600 mb-6">
              {message}
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
