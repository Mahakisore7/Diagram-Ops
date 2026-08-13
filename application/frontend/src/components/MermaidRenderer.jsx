import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  // securityLevel: 'strict' sanitizes the rendered SVG (strips <script>,
  // disables click bindings, escapes injected HTML in labels) before it
  // ever reaches the DOM. mermaidSyntax ultimately originates from an LLM
  // response — not fully trusted input — so this isn't optional. The
  // original Phase 1 draft left securityLevel unset, which is the exact
  // XSS surface this line closes.
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
  initialized = true;
}

// FR-D8: invalid syntax must render an inline error, never crash the page.
// onRendered, if provided, receives the raw SVG string on every successful
// render — used by DiagramDetailPage for SVG/PNG export (FR-E1/FR-E2)
// instead of reaching back into the DOM to find what was just rendered.
export default function MermaidRenderer({ syntax, onRendered }) {
  const reactId = useId();
  const containerId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const renderSeq = useRef(0);

  useEffect(() => {
    ensureInitialized();
    const thisRender = ++renderSeq.current;

    if (!syntax || syntax.trim().length === 0) {
      setSvg('');
      setError(null);
      return;
    }

    // Debounced so live-editing (FR-D4) doesn't fire a render per
    // keystroke. renderSeq guards against a race where an earlier,
    // slower render resolves AFTER a newer one and overwrites it with
    // stale output.
    const timer = setTimeout(async () => {
      try {
        const { svg: rendered } = await mermaid.render(containerId, syntax);
        if (renderSeq.current === thisRender) {
          setSvg(rendered);
          setError(null);
          onRendered?.(rendered);
        }
      } catch (err) {
        if (renderSeq.current === thisRender) {
          setSvg('');
          setError(err.message || 'Could not render this diagram.');
        }
      }
    }, 300);

    return () => clearTimeout(timer);
    // onRendered is intentionally excluded: callers pass a stable setState
    // function (see DiagramDetailPage), and including it here would re-run
    // this effect on every parent re-render if a caller ever passed an
    // inline arrow function instead — the debounce/race-guard above exists
    // specifically to avoid exactly that kind of extra render churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syntax, containerId]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">This diagram couldn't be rendered.</p>
        <p className="mt-1 font-mono text-xs whitespace-pre-wrap">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return <div className="p-4 text-sm text-slate-400">Nothing to render yet.</div>;
  }

  // The only dangerouslySetInnerHTML in the app, and deliberately so:
  // Mermaid has no core React renderer, it returns a full SVG string. The
  // safety control is securityLevel above, not this line — this line just
  // inserts what mermaid.render() already sanitized.
  return <div className="overflow-x-auto rounded-md border border-slate-200 bg-white p-4" dangerouslySetInnerHTML={{ __html: svg }} />;
}
