import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Download,
  FileLock2,
  GitPullRequest,
  History,
  KeyRound,
  Layers,
  Link2,
  RefreshCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
  Zap,
} from 'lucide-react';
import Button from '../components/ui/Button';
import HeroDemo from '../components/landing/HeroDemo';
import { MarketingFooter, MarketingNav } from '../components/landing/MarketingChrome';
import { TypeIcon } from '../components/diagram/TypeBadge';
import { DIAGRAM_TYPES } from '../lib/diagramTypes';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/utils';

const ROTATING = ['architecture', 'sequence', 'ER', 'state', 'flow'];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-flex justify-start overflow-hidden align-bottom lg:min-w-[6ch]">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={ROTATING[i]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="animate-gradient-x bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500 bg-[length:200%_auto] bg-clip-text pb-1 text-transparent"
        >
          {ROTATING[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-28">
      {/* Animated backdrop: masked grid + drifting colour blobs */}
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" aria-hidden />
      <div className="absolute top-0 left-1/2 -z-10 h-[40rem] w-[80rem] -translate-x-1/2" aria-hidden>
        <div className="animate-float absolute top-10 left-[15%] size-[28rem] rounded-full bg-brand-500/25 blur-3xl dark:bg-brand-500/20" />
        <div className="animate-float absolute top-32 right-[12%] size-[24rem] rounded-full bg-fuchsia-500/20 blur-3xl [animation-delay:-3s] dark:bg-fuchsia-500/15" />
        <div className="animate-float absolute top-64 left-[40%] size-[20rem] rounded-full bg-sky-400/20 blur-3xl [animation-delay:-6s] dark:bg-sky-500/10" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8">
        <div className="text-center lg:text-left">
          <motion.a
            href="#security"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 py-1 pr-3 pl-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
          >
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-white">New</span>
            Version history, sharing &amp; audit log
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl xl:text-[3.6rem] xl:leading-[1.08] dark:text-white"
          >
            <span className="block sm:whitespace-nowrap">Describe your system.</span>
            <span className="block sm:whitespace-nowrap">
              Get the <RotatingWord /> diagram.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-xl text-lg text-pretty text-zinc-600 lg:mx-0 dark:text-zinc-400"
          >
            DiagramForge turns plain English into clean, editable Mermaid diagrams in seconds — with live editing,
            version history, one-click sharing and export, on a cloud-native platform built for teams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Button to={user ? '/app/new' : '/register'} variant="gradient" size="lg">
              <Sparkles /> {user ? 'Create a diagram' : 'Start for free'}
            </Button>
            <Button href="#how-it-works" variant="secondary" size="lg">
              See how it works
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 lg:justify-start dark:text-zinc-400"
          >
            {['No credit card', '7 diagram types', 'Export SVG & PNG'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 1200 }}
        >
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}

const STACK = ['React 19', 'Node.js', 'MongoDB', 'Docker', 'Kubernetes (EKS)', 'Terraform', 'Jenkins', 'SonarQube', 'OWASP Dependency-Check', 'Trivy', 'Amazon ECR', 'Groq', 'Claude'];

function StackMarquee() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50/60 py-8 dark:border-zinc-800 dark:bg-zinc-900/30" aria-label="Technology stack">
      <p className="text-center text-xs font-medium tracking-wider text-zinc-500 uppercase">Built on a production-grade, cloud-native stack</p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex w-max gap-10 pr-10">
          {[...STACK, ...STACK].map((name, i) => (
            <span key={`${name}-${i}`} className="text-sm font-semibold whitespace-nowrap text-zinc-400 dark:text-zinc-500" aria-hidden={i >= STACK.length}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Wand2, title: 'Natural language to diagram', body: 'Describe a process, API flow or data model in plain English. The AI picks the right diagram type or follows the one you choose.' },
  { icon: RefreshCcw, title: 'Automatic AI failover', body: 'Groq serves requests first; if it fails, Claude takes over — guarded by a daily cost cap so spend never runs away.' },
  { icon: Layers, title: 'Live split-pane editor', body: 'Tweak the Mermaid source and watch the canvas update instantly, with zoom, pan, fullscreen and keyboard shortcuts.' },
  { icon: History, title: 'Version history', body: 'Every save keeps a snapshot. Preview any of the last 20 versions and restore it in one click.' },
  { icon: Link2, title: 'Secure share links', body: 'Publish a read-only link backed by an unguessable token — and revoke it instantly when you are done.' },
  { icon: Download, title: 'Export anywhere', body: 'Download crisp SVG or 2× PNG, copy the Mermaid source, or export your entire account as JSON.' },
  { icon: Star, title: 'Organise at scale', body: 'Favourites, tags, full-text search, type filters and sorting keep a growing library easy to navigate.' },
  { icon: ScanSearch, title: 'Audit log', body: 'See every sign-in, failed attempt, password change and diagram event, with device and IP details.' },
  { icon: Zap, title: 'Command palette', body: 'Press Ctrl/⌘ K to search diagrams or jump anywhere. Power users never need to touch the mouse.' },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Everything you need</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            From a sentence to a shareable diagram
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            A focused toolset for engineers, architects and students who document systems for a living.
          </p>
        </motion.div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="absolute -top-24 -right-24 size-48 rounded-full bg-brand-500/0 blur-3xl transition group-hover:bg-brand-500/15" aria-hidden />
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold text-zinc-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Describe', body: 'Write what you want in plain English, or start from a template. Optionally pick a diagram type.' },
  { title: 'Generate', body: 'The AI returns validated Mermaid syntax. Invalid output is retried automatically before you ever see it.' },
  { title: 'Refine & share', body: 'Edit live, tag and star it, then export or publish a revocable read-only link for your team.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-zinc-50 py-24 sm:py-32 dark:bg-zinc-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">Three steps. Seconds, not hours.</h2>
        </motion.div>
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block dark:via-brand-700" aria-hidden />
          {STEPS.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.12 }} className="relative text-center">
              <div className="relative mx-auto flex size-12 items-center justify-center rounded-full border border-brand-200 bg-white text-lg font-semibold text-brand-600 shadow-sm dark:border-brand-500/30 dark:bg-zinc-900 dark:text-brand-400">
                {i + 1}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-zinc-900 dark:text-white">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiagramTypes() {
  return (
    <section id="types" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Seven diagram types</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">The right picture for every problem</h2>
        </motion.div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(DIAGRAM_TYPES).map(([key, t], i) => (
            <motion.div
              key={key}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 4) * 0.06 }}
              className={cn(
                'flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50',
                i === 6 && 'lg:col-span-1',
              )}
            >
              <TypeIcon type={key} size="lg" />
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">{t.label}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.description}</p>
              </div>
            </motion.div>
          ))}
          <motion.div {...fadeUp} className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Not sure which? Let the AI decide.
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const GATES = [
  { icon: GitPullRequest, name: 'Unit tests', detail: 'Jest suite on every PR' },
  { icon: ScanSearch, name: 'SonarQube', detail: 'Quality gate: bugs, vulnerabilities, smells' },
  { icon: ShieldCheck, name: 'OWASP Dependency-Check', detail: 'Fails on CVSS ≥ 8' },
  { icon: Boxes, name: 'Trivy image scan', detail: 'Fails on HIGH / CRITICAL' },
  { icon: Cloud, name: 'Amazon ECR', detail: 'Only gated images ship' },
];

function SecuritySection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % (GATES.length + 1)), 1100);
    return () => clearInterval(id);
  }, []);

  const points = [
    { icon: KeyRound, text: 'bcrypt (cost 12) password hashing and stateless JWT sessions' },
    { icon: FileLock2, text: 'Ownership enforced in every query — other users’ data returns 404, never 403' },
    { icon: ShieldCheck, text: 'Strict Mermaid sanitisation, Helmet headers and a Content-Security-Policy' },
    { icon: ScanSearch, text: 'Rate-limited auth, failed sign-in logging and a 90-day audit trail' },
  ];

  return (
    <section id="security" className="relative scroll-mt-20 overflow-hidden bg-zinc-950 py-24 text-white sm:py-32">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" aria-hidden />
      <div className="absolute top-1/2 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div {...fadeUp}>
          <p className="text-sm font-semibold text-brand-400">Secure by design</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every release passes five security gates</h2>
          <p className="mt-4 text-lg text-zinc-400">
            DiagramForge ships through a Jenkins DevSecOps pipeline. Nothing reaches the container registry unless it
            clears static analysis, dependency and image vulnerability scanning.
          </p>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex gap-3 text-sm text-zinc-300">
                <p.icon className="mt-0.5 size-5 shrink-0 text-brand-400" />
                {p.text}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...fadeUp} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">Jenkinsfile.backend</span>
            <span className={cn('rounded-full px-2 py-0.5 font-medium', active >= GATES.length ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300')}>
              {active >= GATES.length ? 'Passed' : 'Running…'}
            </span>
          </div>
          <ol className="mt-5 space-y-2.5">
            {GATES.map((g, i) => {
              const done = i < active;
              const running = i === active;
              return (
                <li
                  key={g.name}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-500',
                    done ? 'border-emerald-500/30 bg-emerald-500/5' : running ? 'border-brand-400/50 bg-brand-500/10' : 'border-white/5 bg-white/[0.02]',
                  )}
                >
                  <g.icon className={cn('size-5 shrink-0', done ? 'text-emerald-400' : running ? 'text-brand-300' : 'text-zinc-600')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', done || running ? 'text-white' : 'text-zinc-500')}>{g.name}</p>
                    <p className="text-xs text-zinc-500">{g.detail}</p>
                  </div>
                  {done ? (
                    <CheckCircle2 className="size-5 text-emerald-400" aria-label="passed" />
                  ) : running ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-brand-300/30 border-t-brand-300" aria-label="running" />
                  ) : (
                    <span className="size-4 rounded-full border-2 border-zinc-700" aria-label="pending" />
                  )}
                </li>
              );
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}

const FAQS = [
  ['What does DiagramForge generate?', 'Mermaid syntax for flowcharts, sequence, class, entity-relationship, state, Gantt and mind-map diagrams. You always get editable source, never a flat image.'],
  ['Which AI models power it?', 'Groq is the primary provider for speed. If it fails, requests fall back to Anthropic Claude, protected by a daily call cap so costs stay bounded.'],
  ['Is my data private?', 'Your diagrams are only visible to you. Share links are opt-in, read-only, use unguessable tokens, and can be revoked at any time.'],
  ['Can I get my data out?', 'Yes. Export any diagram as SVG, PNG or Mermaid source, or download your whole account as JSON from Settings → Data & privacy.'],
  ['What happens if generation fails?', 'Malformed AI output is detected and retried automatically. If it still fails you get a clear error and nothing is saved.'],
  ['How is it deployed?', 'As containers on AWS: images are built and scanned by Jenkins, stored in ECR, and run on Kubernetes (EKS) provisioned with Terraform.'],
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">Questions, answered</h2>
        </motion.div>
        <dl className="mt-12 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
          {FAQS.map(([q, a], i) => (
            <div key={q}>
              <dt>
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-zinc-900 dark:text-white"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                >
                  {q}
                  <ChevronDown className={cn('size-4 shrink-0 text-zinc-400 transition-transform', open === i && 'rotate-180')} />
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.dd
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{a}</p>
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

function FinalCta() {
  const { user } = useAuth();
  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <motion.div
        {...fadeUp}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 px-8 py-16 text-center shadow-2xl shadow-brand-900/20 sm:px-16"
      >
        <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your next diagram is one sentence away</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Create a free account and generate your first diagram in under a minute.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={user ? '/app/new' : '/register'} size="lg" className="bg-white text-brand-700 hover:bg-white/90">
              <Sparkles /> {user ? 'Open the Studio' : 'Get started free'}
            </Button>
            {!user && (
              <Button to="/login" size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                I already have an account
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function LandingPage() {
  useDocumentTitle('AI diagrams from plain English');
  return (
    <div className="bg-white dark:bg-zinc-950">
      <MarketingNav />
      <main>
        <Hero />
        <StackMarquee />
        <Features />
        <HowItWorks />
        <DiagramTypes />
        <SecuritySection />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
