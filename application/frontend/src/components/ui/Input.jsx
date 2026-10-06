import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export const inputClasses =
  'block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/15 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-900/50';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClasses, 'resize-none', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(inputClasses, 'pr-8', className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('block text-sm font-medium text-zinc-700 dark:text-zinc-300', className)}
      {...props}
    />
  );
}

// Label + control + hint/error, wired together with ids so screen readers
// read the hint and error alongside the field.
export function Field({ label, hint, error, children, className, action }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = error || hint ? hintId : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || action) && (
        <div className="flex items-center justify-between">
          {label && <Label htmlFor={id}>{label}</Label>}
          {action}
        </div>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p
          id={hintId}
          className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export const PasswordInput = forwardRef(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(inputClasses, 'pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
