import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, History, X } from 'lucide-react';
import { diagramsApi } from '../../api';
import { Skeleton } from '../ui/primitives';
import { cn, formatDateTime, timeAgo } from '../../lib/utils';

// Slide-over listing saved versions, newest first. Selecting one previews
// it in the editor; restoring is done from the editor's preview banner.
export default function VersionHistory({ open, onClose, diagramId, refreshKey, current, previewIndex, onPreview }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setVersions(null);
    diagramsApi
      .versions(diagramId)
      .then(setVersions)
      .catch((err) => setError(err.message));
  }, [open, diagramId, refreshKey]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-zinc-950/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Version history"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="size-4 text-zinc-500" />
                <h2 className="font-semibold text-zinc-900 dark:text-white">Version history</h2>
              </div>
              <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Close version history">
                <X className="size-4" />
              </button>
            </div>
            <div className="thin-scrollbar flex-1 overflow-y-auto p-3">
              <button
                onClick={() => onPreview(null)}
                className={cn(
                  'mb-1 w-full rounded-xl border p-3 text-left transition',
                  previewIndex === null ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                )}
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Current version</p>
                <p className="mt-0.5 text-xs text-zinc-500">{current?.updatedAt ? `Saved ${timeAgo(current.updatedAt)}` : ''}</p>
              </button>
              {error && <p className="p-3 text-sm text-red-600">{error}</p>}
              {versions === null && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-16 rounded-xl" />)}
              {versions?.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">No earlier versions yet. Each save of the title or source keeps a snapshot here.</p>
              )}
              {versions?.map((v, i) => (
                <button
                  key={`${v.savedAt}-${i}`}
                  onClick={() => onPreview(i, v)}
                  className={cn(
                    'mb-1 w-full rounded-xl border p-3 text-left transition',
                    previewIndex === i ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                  )}
                >
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{v.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500" title={formatDateTime(v.savedAt)}>
                    <Clock className="size-3" /> {timeAgo(v.savedAt)} · {v.mermaidSyntax.split('\n').length} lines
                  </p>
                </button>
              ))}
            </div>
            <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">The last 20 versions are kept.</p>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
