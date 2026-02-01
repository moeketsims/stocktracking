import { create } from 'zustand';
import { CheckCircle, AlertTriangle, XCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Toast helper functions - can be called from anywhere without hooks
 * @example
 * toast.success('Item saved successfully');
 * toast.error('Failed to save item');
 */
export const toast = {
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  warning: (message: string) => useToastStore.getState().addToast(message, 'warning'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
};

const icons: Record<ToastType, JSX.Element> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
};

const borderColors: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

/**
 * Toast container component - renders all active toasts
 * Must be placed at the root of the app (e.g., in App.tsx)
 * Uses aria-live for screen reader announcements
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-start gap-3 bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 ${borderColors[t.type]} px-4 py-3 animate-in slide-in-from-right-5 fade-in duration-200`}
        >
          {icons[t.type]}
          <span className="flex-1 text-sm text-gray-700 break-words">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
