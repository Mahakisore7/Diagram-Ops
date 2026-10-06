import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="df-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#df-logo-g)" />
      <rect x="7" y="7" width="8" height="6" rx="1.5" fill="#fff" />
      <rect x="17" y="19" width="8" height="6" rx="1.5" fill="#fff" />
      <path d="M11 13v4a2 2 0 0 0 2 2h4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = '/', className, compact = false }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)} aria-label="DiagramForge home">
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">
          Diagram<span className="text-brand-600 dark:text-brand-400">Forge</span>
        </span>
      )}
    </Link>
  );
}
