import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Link2, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import DiagramThumbnail from './DiagramThumbnail';
import TypeBadge from './TypeBadge';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu';
import { cn, timeAgo } from '../../lib/utils';

function FavButton({ diagram, onToggleFavorite, className }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onToggleFavorite(diagram);
      }}
      className={cn(
        'rounded-md p-1.5 transition',
        diagram.isFavorite ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-500',
        className,
      )}
      aria-label={diagram.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={diagram.isFavorite}
    >
      <Star className={cn('size-4', diagram.isFavorite && 'fill-current')} />
    </button>
  );
}

function ActionsMenu({ diagram, onDuplicate, onDelete }) {
  return (
    <Menu
      trigger={({ toggle, ...aria }) => (
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
          {...aria}
          className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label={`Actions for ${diagram.title}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    >
      <MenuItem icon={ExternalLink} onClick={() => window.open(`/app/diagrams/${diagram._id}`, '_blank', 'noopener')}>
        Open in new tab
      </MenuItem>
      <MenuItem icon={Copy} onClick={() => onDuplicate(diagram)}>
        Duplicate
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onClick={() => onDelete(diagram)}>
        Delete
      </MenuItem>
    </Menu>
  );
}

function Tags({ tags }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((t) => (
        <span key={t} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          #{t}
        </span>
      ))}
      {tags.length > 3 && <span className="text-[11px] text-zinc-400">+{tags.length - 3}</span>}
    </div>
  );
}

export function DiagramGridCard({ diagram, selected, onSelect, selectMode, ...handlers }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/5 dark:bg-zinc-900/60',
        selected ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-zinc-200 dark:border-zinc-800',
      )}
    >
      <Link
        to={`/app/diagrams/${diagram._id}`}
        onClick={(e) => {
          if (selectMode) {
            e.preventDefault();
            onSelect(diagram);
          }
        }}
        className="block"
      >
        <DiagramThumbnail syntax={diagram.mermaidSyntax} className="aspect-[16/10] border-b border-zinc-100 dark:border-zinc-800" />
        <div className="space-y-2 p-4">
          <h3 className="truncate font-medium text-zinc-900 dark:text-white">{diagram.title}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <TypeBadge type={diagram.diagramType} />
            <span>·</span>
            <span title={new Date(diagram.updatedAt).toLocaleString()}>{timeAgo(diagram.updatedAt)}</span>
            {diagram.shareToken && <Link2 className="size-3.5 text-brand-500" aria-label="Shared" />}
          </div>
          <Tags tags={diagram.tags} />
        </div>
      </Link>
      <div className="absolute top-2 left-2">
        {(selectMode || selected) && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(diagram)}
            className="size-4 accent-brand-600"
            aria-label={`Select ${diagram.title}`}
          />
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-0.5 rounded-lg border border-zinc-200/60 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/90">
        <FavButton diagram={diagram} onToggleFavorite={handlers.onToggleFavorite} />
        <div className="opacity-100 transition sm:w-0 sm:overflow-hidden sm:opacity-0 sm:group-focus-within:w-auto sm:group-focus-within:overflow-visible sm:group-focus-within:opacity-100 sm:group-hover:w-auto sm:group-hover:overflow-visible sm:group-hover:opacity-100">
          <ActionsMenu diagram={diagram} onDuplicate={handlers.onDuplicate} onDelete={handlers.onDelete} />
        </div>
      </div>
    </div>
  );
}

export function DiagramListRow({ diagram, selected, onSelect, selectMode, ...handlers }) {
  return (
    <div className={cn('group flex items-center gap-4 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40', selected && 'bg-brand-50/60 dark:bg-brand-500/10')}>
      {selectMode && (
        <input type="checkbox" checked={selected} onChange={() => onSelect(diagram)} className="size-4 accent-brand-600" aria-label={`Select ${diagram.title}`} />
      )}
      <DiagramThumbnail syntax={diagram.mermaidSyntax} className="hidden h-12 w-20 shrink-0 rounded-lg border border-zinc-100 sm:block dark:border-zinc-800" />
      <Link to={`/app/diagrams/${diagram._id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 dark:text-white">{diagram.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <Tags tags={diagram.tags} />
        </div>
      </Link>
      <TypeBadge type={diagram.diagramType} className="hidden md:inline-flex" />
      <span className="hidden w-28 text-right text-xs text-zinc-500 lg:block">{timeAgo(diagram.updatedAt)}</span>
      <div className="flex items-center">
        <FavButton diagram={diagram} onToggleFavorite={handlers.onToggleFavorite} />
        <ActionsMenu diagram={diagram} onDuplicate={handlers.onDuplicate} onDelete={handlers.onDelete} />
      </div>
    </div>
  );
}
