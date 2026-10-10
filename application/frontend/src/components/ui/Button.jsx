import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Primary is solid ink (graphite on paper, pale line on blueprint). The
// single vermilion "accent" is reserved for the one action per screen that
// matters most - it presses down onto a hard plotter shadow like a stamp.
const ACCENT =
  'bg-brand-600 text-white shadow-[3px_3px_0_0_var(--color-zinc-900)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--color-zinc-900)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:bg-brand-500 dark:shadow-[3px_3px_0_0_var(--color-zinc-50)] dark:hover:shadow-[4px_4px_0_0_var(--color-zinc-50)]';

const VARIANTS = {
  primary:
    'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 active:bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white',
  accent: ACCENT,
  // Kept as an alias so older call sites read the same; no gradients remain.
  gradient: ACCENT,
  secondary:
    'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-300',
  ghost:
    'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-700 text-white hover:bg-red-600 active:bg-red-800',
  'danger-outline':
    'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10',
};

const SIZES = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-9 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-base',
  icon: 'size-9 rounded-lg',
  'icon-sm': 'size-8 rounded-lg',
};

function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

const Button = forwardRef(function Button(
  { variant, size, className, loading = false, disabled, children, to, href, type = 'button', ...props },
  ref,
) {
  const classes = buttonClasses({ variant, size, className });
  const content = (
    <>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
});

export default Button;
