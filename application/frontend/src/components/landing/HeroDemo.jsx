import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';

// Hand-authored scenes for the hero animation: a prompt is "typed", then
// the matching diagram draws itself. Pure SVG + motion - the landing page
// never loads Mermaid (~250KB gzipped), keeping first paint fast.
const SCENES = [
  {
    type: 'flowchart',
    prompt: 'On every push, run tests and a security scan. If both pass, build the image and deploy; otherwise alert the team.',
    nodes: [
      { id: 'a', x: 20, y: 24, w: 92, h: 34, label: 'git push' },
      { id: 'b', x: 140, y: 24, w: 92, h: 34, label: 'Run tests' },
      { id: 'c', x: 260, y: 16, w: 80, h: 50, label: 'Gates pass?', diamond: true },
      { id: 'd', x: 248, y: 118, w: 104, h: 34, label: 'Build image' },
      { id: 'e', x: 248, y: 196, w: 104, h: 34, label: 'Deploy', accent: true },
      { id: 'f', x: 110, y: 118, w: 104, h: 34, label: 'Alert team', warn: true },
    ],
    edges: [
      { d: 'M112 41 H140' },
      { d: 'M232 41 H260' },
      { d: 'M300 66 V118', label: 'yes', lx: 306, ly: 96 },
      { d: 'M300 152 V196' },
      { d: 'M270 54 Q190 70 162 118', label: 'no', lx: 214, ly: 84 },
    ],
  },
  {
    type: 'sequence',
    prompt: 'The browser logs in through the API, which checks the password hash in MongoDB and returns a signed JWT.',
    nodes: [
      { id: 'a', x: 14, y: 12, w: 92, h: 30, label: 'Browser' },
      { id: 'b', x: 134, y: 12, w: 92, h: 30, label: 'API' },
      { id: 'c', x: 254, y: 12, w: 92, h: 30, label: 'MongoDB' },
    ],
    edges: [
      { d: 'M60 42 V240', dashed: true, plain: true },
      { d: 'M180 42 V240', dashed: true, plain: true },
      { d: 'M300 42 V240', dashed: true, plain: true },
      { d: 'M60 78 H180', label: 'POST /login', lx: 84, ly: 72 },
      { d: 'M180 118 H300', label: 'find user', lx: 210, ly: 112 },
      { d: 'M300 158 H180', label: 'user + hash', dashed: true, lx: 206, ly: 152 },
      { d: 'M180 206 H60', label: '200 { token }', dashed: true, lx: 80, ly: 200 },
    ],
  },
  {
    type: 'er',
    prompt: 'Customers place many orders, each order has many items, and every item references one product.',
    nodes: [
      { id: 'a', x: 16, y: 20, w: 120, h: 70, label: 'CUSTOMER', fields: ['id PK', 'email'] },
      { id: 'b', x: 216, y: 20, w: 124, h: 70, label: 'ORDER', fields: ['id PK', 'customer_id FK'] },
      { id: 'c', x: 216, y: 156, w: 124, h: 70, label: 'ORDER_ITEM', fields: ['order_id FK', 'qty'] },
      { id: 'd', x: 16, y: 156, w: 120, h: 70, label: 'PRODUCT', fields: ['id PK', 'price'] },
    ],
    edges: [
      { d: 'M136 55 H216', label: 'places', lx: 158, ly: 49, plain: true, crow: 'M206 47 L216 55 L206 63' },
      { d: 'M278 90 V156', label: 'contains', lx: 284, ly: 126, plain: true, crow: 'M270 146 L278 156 L286 146' },
      { d: 'M216 191 H136', label: 'refers to', lx: 150, ly: 185, plain: true },
    ],
  },
];

function useTypewriter(text, active, speed = 18) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!active) return undefined;
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return out;
}

function Node({ node, delay }) {
  const fill = node.accent ? 'fill-brand-600' : node.warn ? 'fill-amber-50 dark:fill-amber-500/10' : 'fill-white dark:fill-zinc-800';
  const stroke = node.accent ? 'stroke-brand-600' : node.warn ? 'stroke-amber-400' : 'stroke-brand-400 dark:stroke-brand-500';
  const text = node.accent ? 'fill-white' : 'fill-zinc-800 dark:fill-zinc-100';
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
    >
      {node.diamond ? (
        <polygon
          points={`${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`}
          className={`${fill} ${stroke}`}
          strokeWidth="1.5"
        />
      ) : (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" className={`${fill} ${stroke}`} strokeWidth="1.5" />
      )}
      {node.fields ? (
        <>
          <rect x={node.x} y={node.y} width={node.w} height="22" rx="8" className="fill-brand-50 dark:fill-brand-500/20" />
          <text x={cx} y={node.y + 15} textAnchor="middle" className="fill-brand-800 text-[10px] font-semibold dark:fill-brand-200">
            {node.label}
          </text>
          {node.fields.map((f, i) => (
            <text key={f} x={node.x + 10} y={node.y + 38 + i * 15} className="fill-zinc-500 font-mono text-[9px] dark:fill-zinc-400">
              {f}
            </text>
          ))}
        </>
      ) : (
        <text x={cx} y={cy + 3.5} textAnchor="middle" className={`${text} text-[10px] font-medium`}>
          {node.label}
        </text>
      )}
    </motion.g>
  );
}

function Edge({ edge, delay }) {
  return (
    <g>
      <motion.path
        d={edge.d}
        fill="none"
        className="stroke-zinc-400 dark:stroke-zinc-500"
        strokeWidth="1.5"
        strokeDasharray={edge.dashed ? '4 4' : undefined}
        markerEnd={edge.plain ? undefined : 'url(#hero-arrow)'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay, duration: 0.5, ease: 'easeInOut' }}
      />
      {edge.crow && (
        <motion.path
          d={edge.crow}
          fill="none"
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.4 }}
        />
      )}
      {edge.label && (
        <motion.text
          x={edge.lx}
          y={edge.ly}
          className="fill-zinc-500 text-[9px] dark:fill-zinc-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.35 }}
        >
          {edge.label}
        </motion.text>
      )}
    </g>
  );
}

export default function HeroDemo() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('typing'); // typing -> drawing
  const scene = SCENES[index];
  const typed = useTypewriter(scene.prompt, phase === 'typing', reduce ? 0 : 16);

  useEffect(() => {
    if (phase === 'typing' && typed.length >= scene.prompt.length) {
      const t = setTimeout(() => setPhase('drawing'), 450);
      return () => clearTimeout(t);
    }
    if (phase === 'drawing') {
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % SCENES.length);
        setPhase('typing');
      }, 5200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, typed, scene.prompt.length]);

  return (
    <div className="relative">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-brand-500/30 via-violet-500/30 to-fuchsia-500/30 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-2xl shadow-brand-900/10 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-zinc-400">diagramforge.app/studio</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Zap className="size-3" /> Groq · live
          </span>
        </div>
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-zinc-100 p-5 md:border-r md:border-b-0 dark:border-zinc-800">
            <p className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">Describe it</p>
            <p className="mt-2 min-h-28 font-mono text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {typed}
              {phase === 'typing' && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-brand-500" />}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                <Sparkles className="size-3.5" />
                {phase === 'typing' ? 'Generate' : 'Generated'}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={scene.type}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {scene.type}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <div className="relative p-4 [background-image:radial-gradient(circle,rgb(161_161_170/0.25)_1px,transparent_1px)] [background-size:16px_16px]">
            <svg viewBox="0 0 360 250" className="h-auto w-full" role="img" aria-label={`Example ${scene.type} diagram`}>
              <defs>
                <marker id="hero-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" className="fill-zinc-400 dark:fill-zinc-500" />
                </marker>
              </defs>
              {phase === 'drawing' && (
                <g key={index}>
                  {scene.nodes.map((n, i) => (
                    <Node key={n.id} node={n} delay={reduce ? 0 : i * 0.12} />
                  ))}
                  {scene.edges.map((e, i) => (
                    <Edge key={e.d} edge={e} delay={reduce ? 0 : 0.3 + i * 0.18} />
                  ))}
                </g>
              )}
              {phase === 'typing' && (
                <g className="animate-pulse">
                  <rect x="40" y="40" width="110" height="34" rx="8" className="fill-zinc-100 dark:fill-zinc-800" />
                  <rect x="210" y="40" width="110" height="34" rx="8" className="fill-zinc-100 dark:fill-zinc-800" />
                  <rect x="125" y="150" width="110" height="34" rx="8" className="fill-zinc-100 dark:fill-zinc-800" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
