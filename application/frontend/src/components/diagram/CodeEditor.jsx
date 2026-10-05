import { useRef } from 'react';
import { cn } from '../../lib/utils';

// Lightweight source editor: a textarea with a synced line-number gutter
// and Tab-to-indent. Deliberately not Monaco/CodeMirror - Mermaid sources
// are short, and those editors would add hundreds of KB to the bundle.
export default function CodeEditor({ value, onChange, className, readOnly = false, label = 'Mermaid source' }) {
  const gutterRef = useRef(null);
  const lines = value.split('\n').length;

  function onKeyDown(e) {
    if (e.key !== 'Tab' || readOnly) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2;
    });
  }

  return (
    <div
      className={cn('relative flex overflow-hidden bg-zinc-950 font-mono text-[13px] leading-6', className)}
      style={{ fontVariantLigatures: 'none' }}
    >
      <div
        ref={gutterRef}
        className="pointer-events-none overflow-hidden border-r border-white/5 bg-zinc-900/60 px-3 py-4 text-right text-zinc-600 select-none"
        aria-hidden
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label={label}
        className="thin-scrollbar flex-1 resize-none bg-transparent px-4 py-4 whitespace-pre text-zinc-100 caret-brand-400 focus:outline-none"
      />
    </div>
  );
}
