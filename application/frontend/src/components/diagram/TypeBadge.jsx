import { typeMeta } from '../../lib/diagramTypes';
import { cn } from '../../lib/utils';

export function TypeIcon({ type, className, size = 'md' }) {
  const meta = typeMeta(type);
  const Icon = meta.icon;
  const sizes = { sm: 'size-7 rounded-lg [&_svg]:size-3.5', md: 'size-9 rounded-xl [&_svg]:size-4', lg: 'size-11 rounded-xl [&_svg]:size-5' };
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm', meta.accent, sizes[size], className)}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

export default function TypeBadge({ type, className }) {
  const meta = typeMeta(type);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 ring-inset dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}
