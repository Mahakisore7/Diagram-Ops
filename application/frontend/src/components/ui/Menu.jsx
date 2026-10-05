import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

// Dropdown menu with keyboard support: opens on click, arrow keys move
// between items, Escape or an outside click closes it.
export function Menu({ trigger, children, align = 'right', className, rootClassName = 'inline-block' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(listRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];
        const index = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', rootClassName)}>
      {trigger({ open, toggle: () => setOpen((o) => !o), 'aria-haspopup': 'menu', 'aria-expanded': open })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            onClick={() => setOpen(false)}
            className={cn(
              'absolute z-40 mt-2 min-w-48 origin-top overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900',
              align === 'right' ? 'right-0' : 'left-0',
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger, disabled, shortcut }) {
  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition focus:outline-none disabled:opacity-40',
        danger
          ? 'text-red-600 hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10'
          : 'text-zinc-700 hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-70" />}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-zinc-400">{shortcut}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />;
}

export function MenuLabel({ children }) {
  return <div className="px-2.5 pt-2 pb-1 text-xs font-medium text-zinc-400">{children}</div>;
}
