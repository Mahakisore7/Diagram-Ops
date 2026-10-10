import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Minus, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import HeroDemo from '../components/landing/HeroDemo';
import { MarketingFooter, MarketingNav } from '../components/landing/MarketingChrome';
import { TypeIcon } from '../components/diagram/TypeBadge';
import { DIAGRAM_TYPES } from '../lib/diagramTypes';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/utils';

const ease = [0.22, 1, 0.36, 1];
const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease },
};

// Section heading in the specification style: "§ 01 — CAPABILITIES".
function SectionLabel({ n, children, className }) {
  return (
    <p className={cn('label-mono flex items-center gap-3', className)}>
      <span className="text-brand-600 dark:text-brand-400">§ {n}</span>
      <span className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" aria-hidden />
      {children}
    </p>
  );
}

// A drafting ruler along the top edge of the hero: minor ticks every 8px,
// major every 40px, matching the graph-paper grid underneath.
function Ruler() {
  return (
    <div
      className="absolute inset-x-0 top-16 h-3 border-b border-zinc-300 dark:border-zinc-700"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to right, var(--grid-major) 0 1px, transparent 1px 8px), repeating-linear-gradient(to right, var(--color-zinc-400) 0 1px, transparent 1px 40px)',
        backgroundSize: '100% 5px, 100% 12px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'bottom, bottom',
      }}
      aria-hidden
    />
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="graph-paper relative overflow-hidden border-b border-zinc-900 pt-32 pb-20 sm:pt-36 lg:pb-28 dark:border-zinc-100">
      <Ruler />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.12fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="label-mono flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span className="bg-zinc-900 px-1.5 py-0.5 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">DF—01</span>
            AI diagramming
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            Rev. 26.10
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="display mt-7 text-[3.4rem] leading-[0.95] text-zinc-900 sm:text-7xl lg:text-[5.4rem] dark:text-zinc-50"
          >
            <span className="block lg:whitespace-nowrap">Describe the system.</span>
            <span className="relative inline-block italic">
              We&rsquo;ll draw it.
              {/* Vermilion pen stroke, drawn on load */}
              <svg className="absolute -bottom-3 left-0 h-4 w-full overflow-visible" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
                <motion.path
                  d="M2 11 C 60 3, 120 14, 180 7 S 270 4, 298 9"
                  fill="none"
                  className="stroke-brand-600 dark:stroke-brand-400"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.7, duration: 0.9, ease: 'easeInOut' }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="mt-9 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            Write a sentence about an API, a pipeline or a schema. DiagramForge returns clean, editable Mermaid —
            versioned, shareable and exportable — in a second or two.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Button to={user ? '/app/new' : '/register'} variant="accent" size="lg">
              {user ? 'Open the Studio' : 'Start drafting — free'} <ArrowRight />
            </Button>
            <a href="#process" className="group flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="border-b border-zinc-400 pb-0.5 group-hover:border-zinc-900 dark:group-hover:border-zinc-100">See the process</span>
              <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </motion.div>

          {/* Specification row - real numbers only */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-14 grid max-w-lg grid-cols-3 border-y border-zinc-300 dark:border-zinc-700"
          >
            {[
              ['07', 'Diagram types'],
              ['02', 'AI providers, auto-failover'],
              ['05', 'Security gates per release'],
            ].map(([n, label], i) => (
              <div key={label} className={cn('py-4', i > 0 && 'border-l border-zinc-300 pl-4 dark:border-zinc-700')}>
                <dt className="sr-only">{label}</dt>
                <dd className="display text-4xl leading-none text-zinc-900 dark:text-zinc-50">{n}</dd>
                <dd className="mt-1.5 text-xs leading-snug text-zinc-500">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease }} className="relative">
          {/* Dimension line above the sheet */}
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-wider text-zinc-500 uppercase" aria-hidden>
            <span className="h-3 w-px bg-zinc-400" />
            <span className="h-px flex-1 bg-zinc-400" />
            one sentence in · one diagram out
            <span className="h-px flex-1 bg-zinc-400" />
            <span className="h-3 w-px bg-zinc-400" />
          </div>
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}

const STACK = ['React 19', 'Node.js', 'MongoDB', 'Docker', 'Kubernetes · EKS', 'Terraform', 'Jenkins', 'SonarQube', 'OWASP Dependency-Check', 'Trivy', 'Amazon ECR', 'Groq', 'Claude'];

function StackBand() {
  return (
    <section className="overflow-hidden bg-zinc-900 py-4 text-zinc-100 dark:bg-zinc-50 dark:text-zinc-900" aria-label="Technology stack">
      <div className="animate-marquee flex w-max items-center gap-8 pr-8">
        {[...STACK, ...STACK].map((name, i) => (
          <span key={`${name}-${i}`} className="flex items-center gap-8 font-mono text-xs tracking-[0.18em] whitespace-nowrap uppercase" aria-hidden={i >= STACK.length}>
            {name}
            <span className="text-brand-400 dark:text-brand-600">✕</span>
          </span>
        ))}
      </div>
    </section>
  );
}

const CAPABILITIES = [
  ['Plain English in, Mermaid out', 'Describe a process, API exchange or data model. The model picks the right diagram type — or follows the one you choose.'],
  ['Failover you never notice', 'Groq answers first. If it stumbles, Claude takes over, behind a daily cost cap so spend can never run away.'],
  ['Validated before you see it', 'Output is parsed and checked against the declared type; malformed responses are retried once, on the same provider.'],
  ['A live drafting desk', 'Edit the source and the canvas re-plots instantly. Zoom, pan, full-screen, keyboard everything.'],
  ['Every save is a revision', 'The last twenty versions are kept. Preview any of them and restore in one click.'],
  ['Links you can take back', 'Publish a read-only link on an unguessable token; revoke it and the old URL dies instantly.'],
  ['Exports that drop in anywhere', 'SVG, 2× PNG, raw .mmd, or a Markdown block for GitHub, GitLab and Notion. Or your whole account as JSON.'],
  ['An audit trail of your account', 'Sign-ins, failed attempts, password changes and diagram events — with device and IP — kept for 90 days.'],
  ['Built for the keyboard', '⌘/Ctrl K opens a command palette that searches diagrams and jumps anywhere in the workspace.'],
];

function Capabilities() {
  return (
    <section id="capabilities" className="scroll-mt-16 border-b border-zinc-300 dark:border-zinc-800">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
        <motion.div {...reveal} className="lg:sticky lg:top-28 lg:self-start">
          <SectionLabel n="01">Capabilities</SectionLabel>
          <h2 className="display mt-6 text-5xl leading-[1.02] text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Everything a diagram needs. <span className="text-zinc-400 italic dark:text-zinc-500">Nothing it doesn&rsquo;t.</span>
          </h2>
          <p className="mt-6 max-w-sm text-zinc-600 dark:text-zinc-400">
            A focused instrument for engineers, architects and students who document systems for a living.
          </p>
        </motion.div>
        <ol className="border-t border-zinc-900 dark:border-zinc-100">
          {CAPABILITIES.map(([title, body], i) => (
            <motion.li
              key={title}
              {...reveal}
              transition={{ ...reveal.transition, delay: (i % 3) * 0.05 }}
              className="group grid grid-cols-[3rem_1fr] gap-x-4 border-b border-zinc-300 py-6 transition-colors hover:bg-white sm:grid-cols-[3.5rem_1fr_1.3fr] dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="pl-1 font-mono text-sm text-zinc-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{title}</h3>
              <p className="col-start-2 mt-1.5 text-sm leading-relaxed text-zinc-600 sm:col-start-3 sm:mt-0 dark:text-zinc-400">{body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Three tiny line drawings for the process figures.
function FigDescribe() {
  return (
    <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
      {[20, 38, 56, 74].map((y, i) => (
        <motion.line
          key={y}
          x1="24"
          x2={[176, 150, 168, 96][i]}
          y1={y}
          y2={y}
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 * i, duration: 0.5 }}
        />
      ))}
      <rect x="98" y="66" width="2" height="16" className="animate-blink fill-brand-600" />
    </svg>
  );
}
function FigGenerate() {
  return (
    <svg viewBox="0 0 200 110" className="w-full font-mono" aria-hidden>
      <text x="22" y="30" className="fill-zinc-500 text-[11px]">{'{'}</text>
      {[['"type"', '"sequence"'], ['"title"', '"Sign-in"'], ['"mermaid"', '"…"']].map(([k, v], i) => (
        <motion.text
          key={k}
          x="36"
          y={48 + i * 16}
          className="fill-zinc-700 text-[10px] dark:fill-zinc-300"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 36 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.15 }}
        >
          {k}: <tspan className="fill-brand-600 dark:fill-brand-400">{v}</tspan>
        </motion.text>
      ))}
      <text x="22" y="100" className="fill-zinc-500 text-[11px]">{'}'}</text>
      <motion.path d="M152 92 l7 7 l14 -16" fill="none" className="stroke-emerald-600" strokeWidth="2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }} />
      <text x="146" y="108" className="fill-emerald-700 text-[8px] tracking-widest dark:fill-emerald-400">VALID</text>
    </svg>
  );
}
function FigRefine() {
  return (
    <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
      <g className="stroke-zinc-800 dark:stroke-zinc-200" fill="none" strokeWidth="1.5">
        <rect x="20" y="20" width="52" height="24" />
        <rect x="128" y="20" width="52" height="24" />
        <rect x="74" y="70" width="52" height="24" className="fill-brand-600 stroke-brand-600 dark:fill-brand-500 dark:stroke-brand-500" />
        <motion.path d="M72 32 H128 M46 44 V82 H74 M154 44 V82 H126" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
      </g>
      <text x="138" y="104" className="fill-zinc-500 font-mono text-[8px] tracking-wider">REV. 03</text>
    </svg>
  );
}

const STEPS = [
  ['Describe', 'Write it the way you would explain it to a colleague — or start from one of the templates.', FigDescribe],
  ['Generate', 'The model returns JSON with Mermaid inside. It is parsed, type-checked and retried once if it is malformed.', FigGenerate],
  ['Refine & share', 'Edit live, tag and star it, then export it or publish a link you can revoke at any time.', FigRefine],
];

function Process() {
  return (
    <section id="process" className="graph-paper scroll-mt-16 border-b border-zinc-300 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <motion.div {...reveal} className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel n="02">Process</SectionLabel>
            <h2 className="display mt-6 text-5xl text-zinc-900 sm:text-6xl dark:text-zinc-50">
              Three steps. <span className="italic">Seconds,</span> not afternoons.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">A generation on the primary provider typically takes one to two seconds; nothing is saved until you decide to keep it.</p>
        </motion.div>
        {/* Panels share borders - one drawing, three figures, no floating cards */}
        <div className="mt-14 grid border border-zinc-900 bg-white md:grid-cols-3 dark:border-zinc-100 dark:bg-zinc-900">
          {STEPS.map(([title, body, Fig], i) => (
            <motion.div
              key={title}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className={cn('flex flex-col', i > 0 && 'border-t border-zinc-900 md:border-t-0 md:border-l dark:border-zinc-100')}
            >
              <div className="flex items-center justify-between border-b border-zinc-300 px-5 py-2.5 dark:border-zinc-700">
                <span className="label-mono">Fig. 2.{i + 1}</span>
                <span className="font-mono text-[10px] text-zinc-400">{['INPUT', 'TRANSFORM', 'OUTPUT'][i]}</span>
              </div>
              <div className="px-8 py-6">
                <Fig />
              </div>
              <div className="mt-auto border-t border-zinc-300 p-5 dark:border-zinc-700">
                <h3 className="display text-3xl text-zinc-900 dark:text-zinc-50">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <section id="legend" className="scroll-mt-16 border-b border-zinc-300 dark:border-zinc-800">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
        <motion.div {...reveal}>
          <SectionLabel n="03">Legend</SectionLabel>
          <h2 className="display mt-6 text-5xl leading-[1.02] text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Seven notations. <span className="italic">One sentence each.</span>
          </h2>
          <p className="mt-6 max-w-sm text-zinc-600 dark:text-zinc-400">Not sure which fits? Leave it on Auto and the model chooses the notation that suits the description.</p>
        </motion.div>
        <motion.div {...reveal} className="border border-zinc-900 dark:border-zinc-100">
          <div className="grid grid-cols-[3.5rem_3rem_1fr] border-b border-zinc-900 bg-zinc-100 px-4 py-2 sm:grid-cols-[3.5rem_3rem_10rem_1fr] dark:border-zinc-100 dark:bg-zinc-900">
            <span className="label-mono">Code</span>
            <span className="label-mono">Sym.</span>
            <span className="label-mono">Notation</span>
            <span className="label-mono hidden sm:block">Use it for</span>
          </div>
          {Object.entries(DIAGRAM_TYPES).map(([key, t]) => (
            <div key={key} className="group grid grid-cols-[3.5rem_3rem_1fr] items-center border-b border-zinc-300 px-4 py-3 last:border-b-0 hover:bg-white sm:grid-cols-[3.5rem_3rem_10rem_1fr] dark:border-zinc-800 dark:hover:bg-zinc-900">
              <span className="font-mono text-sm font-medium text-zinc-900 group-hover:text-brand-600 dark:text-zinc-50 dark:group-hover:text-brand-400">{t.code}</span>
              <TypeIcon type={key} size="sm" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t.label}</span>
              <span className="col-span-3 mt-1 text-sm text-zinc-500 sm:col-span-1 sm:mt-0">{t.description}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const GATES = [
  ['01', 'Unit tests', 'Jest, every PR'],
  ['02', 'SonarQube', 'Quality gate'],
  ['03', 'OWASP DC', 'Fails CVSS ≥ 8'],
  ['04', 'Trivy', 'Fails HIGH/CRIT'],
  ['05', 'Amazon ECR', 'Only gated images'],
];

// Always rendered as a cyanotype, whatever the theme - this section is the
// blueprint of how a release is built.
function Quality() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (GATES.length + 2)), 1000);
    return () => clearInterval(id);
  }, []);
  const passed = step >= GATES.length;

  return (
    <section id="quality" className="relative scroll-mt-16 overflow-hidden bg-[#0e2236] text-[#eef4f9]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(182 201 218 / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(182 201 218 / 0.10) 1px, transparent 1px), linear-gradient(to right, rgb(182 201 218 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(182 201 218 / 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <motion.div {...reveal} className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-3 font-mono text-[10.5px] tracking-[0.14em] text-[#8fa9c1] uppercase">
              <span className="text-[#ff7f55]">§ 04</span>
              <span className="h-px w-8 bg-[#3b5874]" />
              Quality control
            </p>
            <h2 className="display mt-6 text-5xl leading-[1.02] sm:text-6xl">
              No release ships without <span className="italic">five signatures.</span>
            </h2>
          </div>
          <ul className="space-y-3 self-end text-sm text-[#b6c9da]">
            {[
              'bcrypt (cost 12) password hashing and stateless JWT sessions',
              'Ownership enforced in every query — another user’s diagram is a 404, never a 403',
              'Strict Mermaid sanitisation, Helmet headers and a Content-Security-Policy',
              'Rate-limited sign-in, failed-attempt logging, 90-day audit trail',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-[#ff7f55]" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Pipeline schematic */}
        <motion.div {...reveal} className="relative mt-16 border border-[#8fa9c1]/60 p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between font-mono text-[10.5px] tracking-[0.14em] text-[#8fa9c1] uppercase">
            <span>Fig. 4.1 — Jenkinsfile.backend</span>
            <span className={passed ? 'text-[#7ee2a8]' : 'text-[#ffb59a]'}>{passed ? '■ Passed — signed off' : '□ Running gate ' + String(step + 1).padStart(2, '0')}</span>
          </div>
          <ol className="grid gap-3 sm:grid-cols-5 sm:gap-0">
            {GATES.map(([n, name, detail], i) => {
              const done = i < step;
              const running = i === step;
              return (
                <li key={n} className="relative flex sm:block">
                  <div
                    className={cn(
                      'relative flex-1 border px-4 py-4 transition-all duration-500 sm:mr-6',
                      done ? 'border-[#eef4f9] bg-[#eef4f9] text-[#0e2236]' : running ? 'border-[#ff7f55] text-[#eef4f9]' : 'border-dashed border-[#52708c] text-[#6c8aa6]',
                    )}
                  >
                    <p className="font-mono text-[10px] tracking-widest">{n}</p>
                    <p className="mt-1 font-medium">{name}</p>
                    <p className={cn('mt-0.5 text-xs', done ? 'text-[#2b4661]' : 'opacity-80')}>{detail}</p>
                    {running && <span className="animate-blink absolute top-3 right-3 size-1.5 bg-[#ff7f55]" />}
                    {/* connector to the next stage */}
                    {i < GATES.length - 1 && (
                      <span className={cn('absolute top-1/2 -right-6 hidden h-px w-6 sm:block', done ? 'bg-[#eef4f9]' : 'bg-[#52708c]')} aria-hidden />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}

const NOTES = [
  ['What exactly does it produce?', 'Mermaid source for flowcharts, sequence, class, entity-relationship, state, Gantt and mind-map diagrams. You always receive editable text, never a flat image.'],
  ['Which models are behind it?', 'Groq serves requests first for speed. If it fails, requests fall back to Anthropic Claude, protected by a daily call cap so cost stays bounded.'],
  ['Who can see my diagrams?', 'Only you. Share links are opt-in, read-only, built on unguessable tokens and revocable at any time; a shared view never reveals your prompt or account.'],
  ['Can I take my work elsewhere?', 'Yes — SVG, PNG, .mmd or Markdown per diagram, or your entire account as a single JSON export from Settings.'],
  ['What if a generation fails?', 'Malformed output is detected and retried once automatically. If it still fails you get a clear message, and nothing is saved.'],
  ['How is it deployed?', 'As containers on AWS: built and scanned by Jenkins, stored in ECR, and run on Kubernetes (EKS) provisioned with Terraform.'],
];

function Notes() {
  const [open, setOpen] = useState(0);
  return (
    <section id="notes" className="scroll-mt-16 border-b border-zinc-300 dark:border-zinc-800">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
        <motion.div {...reveal}>
          <SectionLabel n="05">Notes</SectionLabel>
          <h2 className="display mt-6 text-5xl text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Margin <span className="italic">notes.</span>
          </h2>
        </motion.div>
        <dl className="border-t border-zinc-900 dark:border-zinc-100">
          {NOTES.map(([q, a], i) => (
            <div key={q} className="border-b border-zinc-300 dark:border-zinc-800">
              <dt>
                <button
                  className="group grid w-full grid-cols-[3.5rem_1fr_auto] items-center py-5 text-left"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                >
                  <span className="font-mono text-sm text-zinc-400 group-hover:text-brand-600">Q.{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[17px] text-zinc-900 dark:text-zinc-50">{q}</span>
                  {open === i ? <Minus className="size-4 text-zinc-500" /> : <Plus className="size-4 text-zinc-500" />}
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.dd initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="max-w-2xl pb-6 pl-14 leading-relaxed text-zinc-600 dark:text-zinc-400">{a}</p>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Circular approval stamp with text on a path, slowly rotating.
function Stamp({ className }) {
  return (
    <svg viewBox="0 0 160 160" className={cn('animate-spin-slow', className)} aria-hidden>
      <defs>
        <path id="stamp-circle" d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" />
      </defs>
      <circle cx="80" cy="80" r="74" fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="2" />
      <circle cx="80" cy="80" r="44" fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="1.5" />
      <text className="fill-brand-600 font-mono text-[11.5px] tracking-[0.3em] dark:fill-brand-400">
        <textPath href="#stamp-circle">APPROVED FOR PRODUCTION · DIAGRAMFORGE · </textPath>
      </text>
      <path d="M62 80 l12 12 l24 -26" fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}

function FinalCta() {
  const { user } = useAuth();
  return (
    <section className="graph-paper relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-36">
        <motion.div {...reveal} className="relative border border-zinc-900 bg-white p-10 sm:p-16 dark:border-zinc-100 dark:bg-zinc-900">
          <Stamp className="absolute -top-12 -right-6 size-32 opacity-90 sm:-top-16 sm:right-10 sm:size-44" />
          <p className="label-mono">Final sheet</p>
          <h2 className="display mt-5 max-w-3xl text-6xl leading-[0.95] text-zinc-900 sm:text-8xl dark:text-zinc-50">
            Put it on <span className="italic">paper.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-zinc-600 dark:text-zinc-400">Create a free account and plot your first diagram in under a minute.</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button to={user ? '/app/new' : '/register'} variant="accent" size="lg">
              {user ? 'Open the Studio' : 'Start drafting — free'} <ArrowRight />
            </Button>
            {!user && (
              <Button to="/login" variant="ghost" size="lg">
                I already have an account
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  useDocumentTitle('Describe the system. We’ll draw it.');
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      <MarketingNav />
      <main>
        <Hero />
        <StackBand />
        <Capabilities />
        <Process />
        <Legend />
        <Quality />
        <Notes />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
