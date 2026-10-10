import { typeMeta } from '../../lib/diagramTypes';
import { cn } from '../../lib/utils';

// A diagram type is drawn like a symbol in a drawing legend: the glyph in a
// hairline frame, with its two-letter code. Monochrome on purpose - colour
// is reserved for the single accent and for data.
export function TypeIcon({ type, className, size = 'md' }) {
  const meta = typeMeta(type);
  const Icon = meta.icon;
  const sizes = {
    sm: 'size-7 [&_svg]:size-3.5',
    md: 'size-9 [&_svg]:size-4',
    lg: 'size-11 [&_svg]:size-5',
  };
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center border border-zinc-300 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

export default function TypeBadge({ type, className }) {
  const meta = typeMeta(type);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-zinc-300 px-1.5 py-px font-mono text-[10.5px] font-medium tracking-wide text-zinc-600 uppercase dark:border-zinc-700 dark:text-zinc-400',
        className,
      )}
      title={meta.label}
    >
      <span className="text-zinc-900 dark:text-zinc-100">{meta.code}</span>
      <span className="h-2.5 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden />
      {meta.label}
    </span>
  );
}
