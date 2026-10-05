import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

// Accessible modal: portal to <body>, Escape closes, focus moves into the
// dialog on open, Tab is trapped inside it, and focus returns to whatever
// opened it on close.
export function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocus }) {
  const panelRef = useRef(null);
  // Callers usually pass an inline onClose. Reading it through a ref keeps
  // the effect below keyed on `open` alone - otherwise every parent
  // re-render (e.g. typing in a field inside the modal) would re-run it and
  // yank focus back to the first element.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const focusTimer = setTimeout(() => {
      const target = initialFocus?.current || panel?.querySelector(FOCUSABLE);
      target?.focus();
    }, 30);

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll(FOCUSABLE)];
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
    // initialFocus is a ref object (stable identity), read only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900',
              widths[size],
            )}
          >
            {title && (
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
                  {description && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 sm:flex-row sm:justify-end dark:border-zinc-800 dark:bg-zinc-900/60">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Replaces window.confirm: styled, accessible, and can show a spinner while
// the confirmed action runs. `confirmText` optionally requires the user to
// type a phrase (e.g. DELETE) before the destructive button enables.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  confirmText,
  children,
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller already reported the failure (toast); keep the dialog
      // open so the user can correct their input and retry.
    } finally {
      setBusy(false);
    }
  }

  const blocked = confirmText && typed !== confirmText;

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        {tone === 'danger' && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
          {children}
          {confirmText && (
            <div className="mt-4">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Type <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{confirmText}</span> to confirm
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
