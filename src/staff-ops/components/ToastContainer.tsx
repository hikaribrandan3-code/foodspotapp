import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Package, DollarSign } from 'lucide-react';

interface Toast {
  id: string;
  type: 'new_order' | 'critical' | 'cash_verified' | 'delivery_done';
  title: string;
  message: string;
  orderId?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [ { ...toast, id }, ...prev ].slice(0, 4));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pt-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ y: -40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto w-[95%] max-w-[430px] rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
              style={{
                backgroundColor: toast.type === 'critical'
                  ? 'var(--urgency-critical-bg)'
                  : toast.type === 'cash_verified'
                  ? 'var(--urgency-warning-bg)'
                  : toast.type === 'delivery_done'
                  ? 'var(--reception-bg)'
                  : 'var(--card-bg)',
                border: `1px solid ${
                  toast.type === 'critical'
                    ? 'var(--urgency-critical-border)'
                    : toast.type === 'cash_verified'
                    ? 'var(--urgency-warning-border)'
                    : toast.type === 'delivery_done'
                    ? 'var(--reception-border)'
                    : 'var(--card-border)'
                }`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Icon */}
              {toast.type === 'critical' && <AlertTriangle size={18} style={{ color: 'var(--timer-critical)' }} />}
              {toast.type === 'new_order' && <Package size={18} style={{ color: 'var(--status-icon-prep)' }} />}
              {toast.type === 'cash_verified' && <DollarSign size={18} style={{ color: 'var(--status-icon-ready)' }} />}
              {toast.type === 'delivery_done' && <Package size={18} style={{ color: 'var(--reception-text)' }} />}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {toast.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {toast.message}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={() => removeToast(toast.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
                style={{ backgroundColor: 'var(--btn-secondary-bg)' }}
              >
                <X size={14} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}
