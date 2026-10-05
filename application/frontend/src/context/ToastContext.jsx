import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
  info: { icon: Info, className: 'text-brand-600 dark:text-brand-400' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (variant, title, description, { duration = 4500 } = {}) => {
      const id = ++nextId.current;
      setToasts((all) => [...all.slice(-3), { id, variant, title, description }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (title, description, opts) => show('success', title, description, opts),
      error: (title, description, opts) => show('error', title, description, opts),
      warning: (title, description, opts) => show('warning', title, description, opts),
      info: (title, description, opts) => show('info', title, description, opts),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* aria-live so screen readers announce toasts without stealing focus. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, className } = VARIANTS[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg shadow-zinc-900/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
                role="status"
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded-md p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Dismiss notification"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
