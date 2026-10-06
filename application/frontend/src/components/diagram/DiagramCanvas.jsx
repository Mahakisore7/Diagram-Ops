import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, Plus, Scan } from 'lucide-react';
import MermaidRenderer from './MermaidRenderer';
import { cn } from '../../lib/utils';

const MIN = 0.25;
const MAX = 4;

// Zoomable, pannable canvas around MermaidRenderer: Ctrl/Cmd + wheel to
// zoom, drag to pan, buttons for zoom/fit, and a fullscreen toggle.
export default function DiagramCanvas({ syntax, onRendered, className, toolbarExtra }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const drag = useRef(null);

  const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    // Non-passive so preventDefault can stop the browser's page zoom.
    function onWheel(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setScale((s) => clamp(s * (e.deltaY < 0 ? 1.1 : 0.9)));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }
  function onPointerUp() {
    drag.current = null;
  }

  const btn =
    'flex size-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-zinc-50 dark:bg-zinc-900/40',
        fullscreen ? 'bg-white dark:bg-zinc-950' : '',
        className,
      )}
    >
      {/* Dot grid backdrop, like a design canvas. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,rgb(161_161_170/0.35)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-30"
        aria-hidden
      />
      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={reset}
      >
        <div
          className="flex h-full w-full items-center justify-center p-8"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center' }}
        >
          <MermaidRenderer syntax={syntax} onRendered={onRendered} className="diagram-fit h-full w-full" />
        </div>
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        {toolbarExtra}
        <button className={btn} onClick={() => setScale((s) => clamp(s * 0.8))} aria-label="Zoom out" title="Zoom out">
          <Minus className="size-4" />
        </button>
        <button
          className="h-8 min-w-12 rounded-md px-1 text-xs font-medium text-zinc-600 tabular-nums hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={reset}
          title="Reset zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button className={btn} onClick={() => setScale((s) => clamp(s * 1.25))} aria-label="Zoom in" title="Zoom in">
          <Plus className="size-4" />
        </button>
        <button className={btn} onClick={reset} aria-label="Fit to view" title="Fit to view">
          <Scan className="size-4" />
        </button>
        <button className={btn} onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}
