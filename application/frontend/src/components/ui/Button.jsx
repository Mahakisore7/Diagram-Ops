import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-500 active:bg-brand-700 disabled:bg-brand-600/50',
  secondary:
    'border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700 disabled:bg-red-600/50',
  'danger-outline':
    'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40',
  gradient:
    'bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 bg-[length:200%_100%] text-white shadow-lg shadow-brand-600/25 animate-gradient-x hover:shadow-brand-600/40',
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
