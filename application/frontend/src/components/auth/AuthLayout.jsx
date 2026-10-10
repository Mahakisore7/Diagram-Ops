import { motion } from 'motion/react';
import Logo from '../brand/Logo';

const ease = [0.22, 1, 0.36, 1];

// An annotated system drawing, plotted on a cyanotype sheet. Always blue:
// it is the "blueprint" half of the split screen regardless of theme.
function BlueprintDrawing() {
  const line = { stroke: '#d8e4ee', strokeWidth: 1.25, fill: 'none' };
  const draw = (delay) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { delay, duration: 0.9, ease: 'easeInOut' },
  });
  const pop = (delay) => ({
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease },
  });
  const label = { fill: '#eef4f9', fontSize: 11, fontFamily: 'var(--font-sans)' };
  const note = { fill: '#8fa9c1', fontSize: 8.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' };

  return (
    <svg viewBox="0 0 420 330" className="w-full max-w-md" role="img" aria-label="Blueprint of a browser, API and database">
      {/* nodes */}
      <motion.rect x="20" y="40" width="110" height="50" {...line} {...draw(0.2)} />
      <motion.text x="75" y="70" textAnchor="middle" style={label} {...pop(0.6)}>Browser</motion.text>
      <motion.rect x="290" y="40" width="110" height="50" {...line} {...draw(0.35)} />
      <motion.text x="345" y="70" textAnchor="middle" style={label} {...pop(0.75)}>API</motion.text>
      <motion.path d="M290 230 a55 12 0 0 1 110 0 v50 a55 12 0 0 1 -110 0 z M290 230 a55 12 0 0 0 110 0" {...line} {...draw(0.5)} />
      <motion.text x="345" y="268" textAnchor="middle" style={label} {...pop(0.9)}>MongoDB</motion.text>

      {/* connectors */}
      <motion.path d="M130 58 H290" {...line} strokeDasharray="0" {...draw(1.0)} />
      <motion.path d="M290 74 H130" stroke="#8fa9c1" strokeWidth="1" strokeDasharray="4 4" fill="none" {...draw(1.6)} />
      <motion.path d="M345 90 V218" {...line} {...draw(1.25)} />
      <motion.text x="210" y="52" textAnchor="middle" style={note} {...pop(1.3)}>POST /LOGIN</motion.text>
      <motion.text x="210" y="88" textAnchor="middle" style={note} {...pop(1.9)}>200 · JWT</motion.text>
      <motion.text x="352" y="158" style={note} {...pop(1.5)}>BCRYPT 12</motion.text>

      {/* the one vermilion element: the token */}
      <motion.circle cx="75" cy="130" r="5" fill="#ff7f55" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.1, type: 'spring' }} />
      <motion.path d="M75 90 V125" stroke="#ff7f55" strokeWidth="1.25" fill="none" {...draw(2.0)} />
      <motion.text x="88" y="134" style={{ ...note, fill: '#ffb59a' }} {...pop(2.2)}>SESSION TOKEN</motion.text>

      {/* dimension line */}
      <motion.g {...pop(2.4)}>
        <path d="M20 312 H400 M20 306 V318 M400 306 V318" stroke="#52708c" strokeWidth="1" fill="none" />
        <rect x="160" y="305" width="100" height="14" fill="#0e2236" />
        <text x="210" y="315" textAnchor="middle" style={note}>ONE SENTENCE</text>
      </motion.g>
    </svg>
  );
}

export default function AuthLayout({ title, subtitle, children, footer, eyebrow = 'Access' }) {
  return (
    <div className="grid min-h-screen bg-zinc-50 lg:grid-cols-[1fr_1.05fr] dark:bg-zinc-950">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mx-auto w-full max-w-sm py-12"
          >
            <p className="label-mono">{eyebrow}</p>
            <h1 className="display mt-3 text-5xl leading-none text-zinc-900 dark:text-zinc-50">{title}</h1>
            {subtitle && <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
            <div className="mt-9">{children}</div>
            {footer && <div className="mt-8 border-t border-zinc-300 pt-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">{footer}</div>}
          </motion.div>
        </div>
        <p className="font-mono text-[10.5px] tracking-wider text-zinc-400 uppercase">© {new Date().getFullYear()} DiagramForge</p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-zinc-900 bg-[#0e2236] lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(182 201 218 / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(182 201 218 / 0.10) 1px, transparent 1px), linear-gradient(to right, rgb(182 201 218 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(182 201 218 / 0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
          }}
          aria-hidden
        />
        {/* sheet frame */}
        <div className="absolute inset-6 border border-[#8fa9c1]/40" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-14">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-[#8fa9c1] uppercase">Sheet A — Sign-in flow</p>
          <div className="flex justify-center">
            <BlueprintDrawing />
          </div>
          <div className="flex items-end justify-between gap-8">
            <p className="display max-w-sm text-4xl leading-tight text-[#eef4f9]">
              Every system starts as <span className="italic text-[#ffb59a]">a sentence.</span>
            </p>
            <div className="shrink-0 border border-[#8fa9c1]/60 font-mono text-[9px] tracking-widest text-[#8fa9c1] uppercase">
              <div className="border-b border-[#8fa9c1]/60 px-2.5 py-1">Scale 1 : 1</div>
              <div className="px-2.5 py-1">Rev. 26.10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
