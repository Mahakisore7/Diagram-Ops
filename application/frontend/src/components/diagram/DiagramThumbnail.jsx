import { useEffect, useRef, useState } from 'react';
import MermaidRenderer from './MermaidRenderer';
import { cn } from '../../lib/utils';

// Renders a diagram preview only once its card scrolls into view, so a
// library page of 24 diagrams doesn't run 24 Mermaid renders up front.
export default function DiagramThumbnail({ syntax, className }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'pointer-events-none relative overflow-hidden bg-zinc-50 select-none dark:bg-zinc-900/60 [&_.diagram-svg]:flex [&_.diagram-svg]:h-full [&_.diagram-svg]:items-center [&_.diagram-svg]:justify-center [&_.diagram-svg_svg]:max-h-full',
        className,
      )}
      aria-hidden
    >
      {visible ? (
        <MermaidRenderer syntax={syntax} debounce={0} compact className="h-full w-full p-3" />
      ) : (
        <div className="skeleton m-3 h-[calc(100%-1.5rem)]" />
      )}
    </div>
  );
}
