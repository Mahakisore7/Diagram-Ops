import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

// The mark is a drafting glyph: two plotted nodes joined by an orthogonal
// connector inside a sheet border, with the vermilion "approval stamp" dot.
// Drawn with currentColor so it inherits ink in light mode and the pale
// blueprint line colour in dark mode.
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 text-zinc-900 dark:text-zinc-50', className)} aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 6.5h3M1.5 25.5h3M27.5 6.5h3M27.5 25.5h3" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y="8" width="8" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="18" width="8" height="6" fill="currentColor" />
      <path d="M11 14v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24.5" cy="9.5" r="2.5" className="fill-brand-600 dark:fill-brand-400" />
    </svg>
  );
}

export default function Logo({ to = '/', className, compact = false }) {
  return (
    <Link to={to} className={cn('group flex items-center gap-2.5', className)} aria-label="DiagramForge home">
      <LogoMark className="size-7" />
      {!compact && (
        <span className="text-[17px] leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
          <span className="font-semibold">Diagram</span>
          <span className="font-serif text-[19px] italic">Forge</span>
        </span>
      )}
    </Link>
  );
}
