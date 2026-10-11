import { cn } from '../../lib/utils';

// A drawing sheet: hairline border, flat fill, no floating shadow.
export function Card({ className, children, marks = false, ...props }) {
  return (
    <div
      className={cn('relative border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900', className)}
      {...props}
    >
      {marks && <RegMarks />}
      {children}
    </div>
  );
}

// Registration crosshairs on the four corners, as printed on technical
// drawings to align sheets. Pure decoration; hidden from assistive tech.
export function RegMarks({ className, size = 9 }) {
  const corner = 'pointer-events-none absolute text-zinc-400 dark:text-zinc-500';
  const mark = (
    <svg width={size * 2} height={size * 2} viewBox="0 0 18 18" aria-hidden>
      <path d="M9 0v18M0 9h18" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  return (
    <span className={cn('contents', className)} aria-hidden>
      <span className={cn(corner, '-top-[9px] -left-[9px]')}>{mark}</span>
      <span className={cn(corner, '-top-[9px] -right-[9px]')}>{mark}</span>
      <span className={cn(corner, '-bottom-[9px] -left-[9px]')}>{mark}</span>
      <span className={cn(corner, '-right-[9px] -bottom-[9px]')}>{mark}</span>
    </span>
  );
}

export function CardHeader({ title, description, action, className, fig }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800', className)}>
      <div className="min-w-0">
        {fig && <p className="label-mono mb-0.5">{fig}</p>}
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300',
  brand: 'border-brand-300 text-brand-700 dark:border-brand-500/50 dark:text-brand-300',
  success: 'border-emerald-300 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300',
  warning: 'border-amber-300 text-amber-800 dark:border-amber-500/40 dark:text-amber-300',
  danger: 'border-red-300 text-red-700 dark:border-red-500/40 dark:text-red-300',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border px-1.5 py-px font-mono text-[10.5px] font-medium tracking-wide uppercase [&_svg]:size-3',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Spinner({ className }) {
  return (
    <span
      className={cn('inline-block size-4 animate-spin border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Kbd({ children, className }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center border border-b-2 border-zinc-300 bg-white px-1 font-mono text-[10.5px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className, fig = 'FIG. 00 — EMPTY' }) {
  return (
    <div className={cn('relative flex flex-col items-center justify-center border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700', className)}>
      <p className="label-mono absolute top-3 left-3">{fig}</p>
      {Icon && (
        <div className="mb-5 flex size-14 items-center justify-center border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="display text-2xl text-zinc-900 dark:text-zinc-50">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
        {description && <span className="block text-sm text-zinc-500 dark:text-zinc-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors disabled:opacity-50',
          checked ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50' : 'border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 transition-transform',
            checked ? 'translate-x-6 bg-brand-500' : 'translate-x-1 bg-zinc-400 dark:bg-zinc-500',
          )}
        />
      </button>
    </label>
  );
}

// Page title block: mono eyebrow (section number), serif display title.
export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800">
      <div className="min-w-0">
        {eyebrow && <p className="label-mono mb-2">{eyebrow}</p>}
        <h1 className="display text-4xl leading-none text-zinc-900 sm:text-[2.75rem] dark:text-zinc-50">{title}</h1>
        {description && <p className="mt-2.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
