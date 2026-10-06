import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { renderMermaid } from '../../lib/mermaid';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

// Renders Mermaid source to SVG. FR-D8: invalid syntax renders an inline
// error and never crashes the page. onRendered receives each successful
// SVG string, used by the editor for SVG/PNG export.
export default function MermaidRenderer({ syntax, onRendered, debounce = 300, className, compact = false }) {
  const { resolved } = useTheme();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const renderSeq = useRef(0);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    const thisRender = ++renderSeq.current;

    if (!syntax || syntax.trim().length === 0) {
      setSvg('');
      setError(null);
      return undefined;
    }

    // Debounced so live editing doesn't render per keystroke. renderSeq
    // guards against an older, slower render resolving after a newer one
    // and overwriting it with stale output.
    const timer = setTimeout(async () => {
      try {
        const rendered = await renderMermaid(syntax, resolved);
        if (renderSeq.current === thisRender) {
          setSvg(rendered);
          setError(null);
          onRenderedRef.current?.(rendered);
        }
      } catch (err) {
        if (renderSeq.current === thisRender) {
          setSvg('');
          setError(err?.message || 'Could not render this diagram.');
        }
      }
    }, debounce);

    return () => clearTimeout(timer);
  }, [syntax, resolved, debounce]);

  if (error) {
    if (compact) {
      return (
        <div className={cn('flex items-center justify-center text-zinc-400', className)}>
          <AlertTriangle className="size-5" aria-label="Preview unavailable" />
        </div>
      );
    }
    return (
      <div className={cn('m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300', className)}>
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4" /> This diagram couldn&apos;t be rendered
        </p>
        <p className="mt-2 font-mono text-xs whitespace-pre-wrap opacity-80">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return <div className={cn('skeleton', compact ? 'm-3 h-[calc(100%-1.5rem)]' : 'm-6 h-48', className)} />;
  }

  // The only dangerouslySetInnerHTML in the app, and deliberately so:
  // Mermaid has no React renderer, it returns a full SVG string. The safety
  // control is securityLevel 'strict' in lib/mermaid.js, not this line.
  return <div className={cn('diagram-svg', className)} dangerouslySetInnerHTML={{ __html: svg }} />;
}
