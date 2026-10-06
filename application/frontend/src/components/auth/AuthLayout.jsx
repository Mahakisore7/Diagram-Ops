import { motion } from 'motion/react';
import { CheckCircle2, GitBranch, History, Link2, ShieldCheck } from 'lucide-react';
import Logo from '../brand/Logo';

const POINTS = [
  { icon: GitBranch, text: 'Seven diagram types from a single sentence' },
  { icon: History, text: 'Version history with one-click restore' },
  { icon: Link2, text: 'Revocable, read-only share links' },
  { icon: ShieldCheck, text: 'Audit log of every sign-in and change' },
];

// Split-screen auth layout: the form on the left, an animated brand panel
// on the right (hidden on small screens so the form gets the full width).
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2 dark:bg-zinc-950">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-sm py-12"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{footer}</div>}
          </motion.div>
        </div>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} DiagramForge</p>
      </div>

      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <div className="animate-gradient-x absolute inset-0 bg-gradient-to-br from-brand-700 via-violet-700 to-fuchsia-700 bg-[length:200%_200%] opacity-90" />
        <div className="bg-grid absolute inset-0 opacity-25" aria-hidden />
        <div className="animate-float absolute -top-20 -right-20 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="animate-float absolute -bottom-24 -left-10 size-80 rounded-full bg-fuchsia-400/20 blur-3xl [animation-delay:-4s]" aria-hidden />

        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <h2 className="max-w-md text-4xl font-semibold tracking-tight text-balance">
              Document systems at the speed you design them.
            </h2>
            <ul className="mt-10 space-y-4">
              {POINTS.map((p, i) => (
                <motion.li
                  key={p.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <p.icon className="size-4" />
                  </span>
                  {p.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Floating mini diagram card for depth */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mt-14 max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-xs text-white/70">
              <CheckCircle2 className="size-4 text-emerald-300" /> Generated in 1.2s · flowchart
            </div>
            <svg viewBox="0 0 300 70" className="mt-4 w-full" aria-hidden>
              {[
                [10, 'Request'],
                [110, 'Validate'],
                [210, 'Persist'],
              ].map(([x, label], i) => (
                <g key={label}>
                  <rect x={x} y="18" width="80" height="34" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" />
                  <text x={x + 40} y="39" textAnchor="middle" fill="white" fontSize="11" fontFamily="inherit">
                    {label}
                  </text>
                  {i < 2 && <path d={`M${x + 80} 35 H${x + 108}`} stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />}
                </g>
              ))}
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
