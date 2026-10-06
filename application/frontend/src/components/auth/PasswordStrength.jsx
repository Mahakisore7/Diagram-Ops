import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { meetsPasswordRules, PASSWORD_RULES } from '../../lib/password';

// The strength bar is guidance on top of the hard rule in lib/password.js;
// only the rule itself gates submission.

function score(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return Math.min(4, Math.max(1, s - 1));
}

const LEVELS = [
  { label: 'Too weak', color: 'bg-red-500' },
  { label: 'Weak', color: 'bg-orange-500' },
  { label: 'Fair', color: 'bg-amber-500' },
  { label: 'Good', color: 'bg-emerald-500' },
  { label: 'Strong', color: 'bg-emerald-600' },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const s = meetsPasswordRules(password) ? score(password) : 0;
  const level = LEVELS[s];
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn('h-1 flex-1 rounded-full transition-colors', i <= s ? level.color : 'bg-zinc-200 dark:bg-zinc-800')}
            />
          ))}
        </div>
        <span className="w-16 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">{level.label}</span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn('flex items-center gap-1 text-xs', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')}
            >
              {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
