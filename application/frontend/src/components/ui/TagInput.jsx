import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const MAX_TAGS = 10;
const MAX_LEN = 30;

// Chip-style tag editor. Enter or comma adds a tag, Backspace on an empty
// field removes the last one. Normalisation matches the backend (trimmed,
// lower-case, unique) so what the user sees is exactly what gets saved.
export default function TagInput({ value = [], onChange, placeholder = 'Add tag…', className, id }) {
  const [draft, setDraft] = useState('');

  function add(raw) {
    const tag = raw.trim().toLowerCase().replace(/^#/, '').slice(0, MAX_LEN);
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          #{tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`} className="opacity-60 hover:opacity-100">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft) {
            add(draft);
            setDraft('');
          }
        }}
        placeholder={value.length >= MAX_TAGS ? 'Tag limit reached' : placeholder}
        disabled={value.length >= MAX_TAGS}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
      />
    </div>
  );
}
