import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

// The hero is drawn as an engineering drawing sheet: a prompt is written in
// the margin, then the matching diagram is plotted line by line, and the
// title block in the corner fills in. Hand-authored SVG + motion only - the
// landing page never loads Mermaid (~250KB gzipped).
const SCENES = [
  {
    type: 'FLOWCHART',
    title: 'Release gate',
    ms: '1.21 s',
    prompt: 'On every push, run the tests and a security scan. If both pass, build the image and deploy — otherwise alert the team.',
    nodes: [
      { id: 'a', x: 20, y: 24, w: 92, h: 34, label: 'git push' },
      { id: 'b', x: 140, y: 24, w: 92, h: 34, label: 'Run tests' },
      { id: 'c', x: 260, y: 16, w: 80, h: 50, label: 'Gates pass?', diamond: true },
      { id: 'd', x: 248, y: 118, w: 104, h: 34, label: 'Build image' },
      { id: 'e', x: 248, y: 196, w: 104, h: 34, label: 'Deploy', accent: true },
      { id: 'f', x: 110, y: 118, w: 104, h: 34, label: 'Alert team', dashed: true },
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
    type: 'SEQUENCE',
    title: 'Sign-in handshake',
    ms: '0.94 s',
    prompt: 'The browser signs in through the API, which checks the password hash in MongoDB and returns a signed JWT.',
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
    type: 'ENTITY-REL.',
    title: 'Storefront schema',
    ms: '1.88 s',
    prompt: 'Customers place many orders, each order has many line items, and every item references exactly one product.',
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

const INK = 'stroke-zinc-900 dark:stroke-zinc-100';
const INK_FILL = 'fill-zinc-900 dark:fill-zinc-100';

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
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const fill = node.accent ? 'fill-brand-600 dark:fill-brand-500' : 'fill-white dark:fill-zinc-900';
  const stroke = node.accent ? 'stroke-brand-600 dark:stroke-brand-500' : INK;
  const text = node.accent ? 'fill-white' : INK_FILL;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
    >
      {node.diamond ? (
        <polygon
          points={`${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`}
          className={`${fill} ${stroke}`}
          strokeWidth="1.25"
        />
      ) : (
        <rect
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          className={`${fill} ${stroke}`}
          strokeWidth="1.25"
          strokeDasharray={node.dashed ? '4 3' : undefined}
        />
      )}
      {node.fields ? (
        <>
          <line x1={node.x} x2={node.x + node.w} y1={node.y + 20} y2={node.y + 20} className={INK} strokeWidth="1" />
          <text x={cx} y={node.y + 14} textAnchor="middle" className={`${INK_FILL} font-mono text-[9.5px] font-semibold tracking-wider`}>
            {node.label}
          </text>
          {node.fields.map((f, i) => (
            <text key={f} x={node.x + 9} y={node.y + 36 + i * 15} className="fill-zinc-500 font-mono text-[9px] dark:fill-zinc-400">
              {f}
            </text>
          ))}
        </>
      ) : (
        <text x={cx} y={cy + 3.5} textAnchor="middle" className={`${text} font-sans text-[10.5px] font-medium`}>
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
        className="stroke-zinc-500 dark:stroke-zinc-400"
        strokeWidth="1.1"
        strokeDasharray={edge.dashed ? '3 3' : undefined}
        markerEnd={edge.plain ? undefined : 'url(#hero-arrow)'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay, duration: 0.5, ease: 'easeInOut' }}
      />
      {edge.crow && (
        <motion.path
          d={edge.crow}
          fill="none"
          className="stroke-zinc-500 dark:stroke-zinc-400"
          strokeWidth="1.1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.4 }}
        />
      )}
      {edge.label && (
        <motion.text
          x={edge.lx}
          y={edge.ly}
          className="fill-zinc-500 font-mono text-[8.5px] dark:fill-zinc-400"
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

function TitleCell({ label, value, className }) {
  return (
    <div className={`border-zinc-900/80 px-2.5 py-1.5 dark:border-zinc-100/60 ${className || ''}`}>
      <p className="font-mono text-[8.5px] tracking-[0.16em] text-zinc-500 uppercase">{label}</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          className="truncate font-mono text-[11px] text-zinc-900 dark:text-zinc-50"
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </div>
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
      }, 5600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, typed, scene.prompt.length]);

  const drawn = phase === 'drawing';

  return (
    <div className="relative">
      {/* Sheet: double border like a drawing frame, hard plotter shadow */}
      <div className="border border-zinc-900 bg-white p-1.5 shadow-[10px_10px_0_0_var(--color-zinc-900)] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[10px_10px_0_0_rgb(4_14_26/0.7)]">
        <div className="border border-zinc-900/80 dark:border-zinc-100/60">
          <div className="flex items-center justify-between border-b border-zinc-900/80 px-3 py-2 dark:border-zinc-100/60">
            <span className="label-mono text-zinc-700 dark:text-zinc-300">Sheet {String(index + 1).padStart(2, '0')} / Studio</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
              <span className={`size-1.5 ${drawn ? 'bg-emerald-600' : 'animate-blink bg-brand-600'}`} />
              {drawn ? 'Plotted' : 'Listening'}
            </span>
          </div>

          <div className="grid md:grid-cols-[0.85fr_1.15fr]">
            {/* Margin note: the prompt */}
            <div className="border-b border-zinc-900/80 p-4 md:border-r md:border-b-0 dark:border-zinc-100/60">
              <p className="label-mono">Note 1 — Brief</p>
              <p className="mt-2.5 min-h-32 font-serif text-[17px] leading-snug text-zinc-800 italic dark:text-zinc-200">
                “{typed}
                {phase === 'typing' ? <span className="animate-blink ml-px inline-block h-4 w-[1.5px] translate-y-0.5 bg-brand-600" /> : '”'}
              </p>
            </div>

            {/* Drawing area on graph paper */}
            <div className="graph-paper relative p-3">
              <svg viewBox="0 0 360 250" className="h-auto w-full" role="img" aria-label={`Example ${scene.type.toLowerCase()} diagram`}>
                <defs>
                  <marker id="hero-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10 z" className="fill-zinc-500 dark:fill-zinc-400" />
                  </marker>
                </defs>
                {drawn ? (
                  <g key={index}>
                    {scene.nodes.map((n, i) => (
                      <Node key={n.id} node={n} delay={reduce ? 0 : i * 0.12} />
                    ))}
                    {scene.edges.map((e, i) => (
                      <Edge key={e.d} edge={e} delay={reduce ? 0 : 0.3 + i * 0.18} />
                    ))}
                  </g>
                ) : (
                  <g className="stroke-zinc-400 dark:stroke-zinc-600" fill="none" strokeDasharray="3 4" strokeWidth="1">
                    <rect x="40" y="40" width="110" height="34" />
                    <rect x="210" y="40" width="110" height="34" />
                    <rect x="125" y="150" width="110" height="34" />
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Title block, as in the corner of every engineering drawing */}
          <div className="grid grid-cols-2 border-t border-zinc-900/80 sm:grid-cols-[1.6fr_1fr_1fr_0.8fr] dark:border-zinc-100/60">
            <TitleCell label="Title" value={drawn ? scene.title : '—'} className="col-span-2 border-b sm:col-span-1 sm:border-r sm:border-b-0" />
            <TitleCell label="Type" value={scene.type} className="border-r" />
            <TitleCell label="Model / time" value={drawn ? `groq · ${scene.ms}` : '…'} className="sm:border-r" />
            <TitleCell label="Scale" value="1 : 1" className="hidden sm:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
