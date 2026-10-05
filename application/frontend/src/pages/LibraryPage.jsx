import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  SearchX,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { diagramsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/Modal';
import { Card, EmptyState, PageHeader, Skeleton } from '../components/ui/primitives';
import { DiagramGridCard, DiagramListRow } from '../components/diagram/DiagramCard';
import { DIAGRAM_TYPES, TYPE_KEYS } from '../lib/diagramTypes';
import { cn } from '../lib/utils';

const PAGE_SIZE = 12;
const SORTS = [
  ['updated', 'Last edited'],
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['title', 'Title A–Z'],
];

export default function LibraryPage() {
  const toast = useToast();
  // Filters live in the URL, so a filtered view can be bookmarked, shared
  // with a teammate, and survives a reload or the back button.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const favorite = params.get('favorite') === 'true';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'updated';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  useDocumentTitle(favorite ? 'Favourites' : 'Library');

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebounce(search, 300);
  const [view, setView] = useLocalStorage('diagramforge_library_view', 'grid');
  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);

  const update = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      Object.entries(changes).forEach(([k, v]) => {
        if (v === '' || v === null || v === false || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in changes)) next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    if (debouncedSearch !== q) update({ q: debouncedSearch });
    // Only the debounced input should drive this - not every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const load = useCallback(() => {
    setError(null);
    return diagramsApi
      .list({ q, type, favorite, tag, sort, page, limit: PAGE_SIZE })
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message));
  }, [q, type, favorite, tag, sort, page]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  useEffect(() => {
    setSelected(new Set());
  }, [q, type, favorite, tag, sort, page]);

  const handlers = {
    onToggleFavorite: async (d) => {
      const next = !d.isFavorite;
      setData((rows) => rows.map((r) => (r._id === d._id ? { ...r, isFavorite: next } : r)));
      try {
        await diagramsApi.update(d._id, { isFavorite: next });
        if (favorite && !next) setData((rows) => rows.filter((r) => r._id !== d._id));
      } catch (err) {
        setData((rows) => rows.map((r) => (r._id === d._id ? { ...r, isFavorite: !next } : r)));
        toast.error('Could not update favourite', err.message);
      }
    },
    onDuplicate: async (d) => {
      try {
        const copy = await diagramsApi.duplicate(d._id);
        toast.success('Diagram duplicated', copy.title);
        load();
      } catch (err) {
        toast.error('Could not duplicate', err.message);
      }
    },
    onDelete: (d) =>
      setConfirm({
        title: `Delete “${d.title}”?`,
        description: 'This permanently deletes the diagram and its version history. Share links stop working.',
        run: async () => {
          await diagramsApi.remove(d._id);
          toast.success('Diagram deleted');
          load();
        },
      }),
  };

  function toggleSelect(d) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(d._id)) next.delete(d._id);
      else next.add(d._id);
      return next;
    });
  }

  async function bulk(action) {
    const ids = [...selected];
    if (action === 'delete') {
      setConfirm({
        title: `Delete ${ids.length} diagram${ids.length === 1 ? '' : 's'}?`,
        description: 'This cannot be undone.',
        run: async () => {
          const results = await Promise.allSettled(ids.map((id) => diagramsApi.remove(id)));
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed) toast.warning(`${ids.length - failed} deleted, ${failed} failed`);
          else toast.success(`${ids.length} diagram${ids.length === 1 ? '' : 's'} deleted`);
          setSelectMode(false);
          load();
        },
      });
    } else if (action === 'favorite') {
      await Promise.allSettled(ids.map((id) => diagramsApi.update(id, { isFavorite: true })));
      toast.success(`Added ${ids.length} to favourites`);
      setSelectMode(false);
      load();
    }
  }

  const hasFilters = q || type || favorite || tag;
  const Row = view === 'grid' ? DiagramGridCard : DiagramListRow;

  return (
    <div className="space-y-6">
      <PageHeader
        title={favorite ? 'Favourites' : 'Library'}
        description={pagination ? `${pagination.total} diagram${pagination.total === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}` : 'Your saved diagrams'}
        actions={
          <>
            <Button variant={selectMode ? 'secondary' : 'ghost'} onClick={() => setSelectMode((m) => !m)}>
              <CheckSquare /> {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button to="/app/new">
              <Plus /> New diagram
            </Button>
          </>
        }
      />

      {/* Filter bar - one row above the results */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pr-9 pl-9 text-sm shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Search diagrams"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onChange={(e) => update({ type: e.target.value })} className="h-10 w-auto" aria-label="Filter by type">
            <option value="">All types</option>
            {TYPE_KEYS.map((k) => (
              <option key={k} value={k}>
                {DIAGRAM_TYPES[k].label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-10 w-auto" aria-label="Sort">
            {SORTS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
          <button
            onClick={() => update({ favorite: !favorite })}
            aria-pressed={favorite}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition',
              favorite
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
            )}
          >
            <Star className={cn('size-4', favorite && 'fill-current')} /> Favourites
          </button>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label="View">
            {[
              ['grid', LayoutGrid],
              ['list', List],
            ].map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                aria-label={`${key} view`}
                className={cn('rounded-md p-2 transition', view === key ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'text-zinc-400 hover:text-zinc-700')}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {tag && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Tag:</span>
          <button
            onClick={() => update({ tag: '' })}
            className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
          >
            <Tag className="size-3" /> {tag} <X className="size-3" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-16 z-10 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/90 px-4 py-2.5 backdrop-blur dark:border-brand-500/30 dark:bg-brand-500/10"
          >
            <span className="text-sm font-medium text-brand-900 dark:text-brand-200">{selected.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setSelected(new Set(data.map((d) => d._id)))}>
              Select page
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => bulk('favorite')}>
                <Star /> Favourite
              </Button>
              <Button size="sm" variant="danger" onClick={() => bulk('delete')}>
                <Trash2 /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      {data === null ? (
        view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-10" />
              </div>
            ))}
          </Card>
        )
      ) : data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching diagrams"
            description="Try a different search term or clear the filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setParams({}, { replace: true });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Your library is empty"
            description="Diagrams you save from the Studio will show up here."
            action={
              <Button to="/app/new">
                <Plus /> Create a diagram
              </Button>
            }
          />
        )
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {data.map((d, i) => (
            <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
              <Row diagram={d} selectMode={selectMode} selected={selected.has(d._id)} onSelect={toggleSelect} {...handlers} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-zinc-100 overflow-visible dark:divide-zinc-800">
          {data.map((d) => (
            <Row key={d._id} diagram={d} selectMode={selectMode} selected={selected.has(d._id)} onSelect={toggleSelect} {...handlers} />
          ))}
        </Card>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800" aria-label="Pagination">
          <p className="text-sm text-zinc-500">
            Page <span className="font-medium text-zinc-900 dark:text-white">{pagination.page}</span> of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
              <ChevronLeft /> Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => update({ page: page + 1 })}>
              Next <ChevronRight />
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await confirm.run();
          } catch (err) {
            toast.error('Action failed', err.message);
          }
        }}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel="Delete"
      />
    </div>
  );
}
