import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Menu as MenuIcon, Moon, Sun, X } from 'lucide-react';
import Logo, { LogoMark } from '../brand/Logo';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

const LINKS = [
  { href: '#capabilities', n: '01', label: 'Capabilities' },
  { href: '#process', n: '02', label: 'Process' },
  { href: '#legend', n: '03', label: 'Legend' },
  { href: '#quality', n: '04', label: 'Quality' },
  { href: '#notes', n: '05', label: 'Notes' },
];

export function MarketingNav() {
  const { user } = useAuth();
  const { resolved, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300',
        scrolled
          ? 'border-zinc-300 bg-zinc-50/90 backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/90'
          : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-10 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="group flex items-baseline gap-1.5 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
              <span className="font-mono text-[10px] text-zinc-400 group-hover:text-brand-600 dark:text-zinc-500">{l.n}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={resolved === 'dark' ? 'Switch to paper (light) mode' : 'Switch to blueprint (dark) mode'}>
            {resolved === 'dark' ? <Sun /> : <Moon />}
          </Button>
          {user ? (
            <Button to="/app" size="sm" className="hidden sm:inline-flex">
              Open workspace <ArrowUpRight />
            </Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button to="/register" size="sm" className="hidden sm:inline-flex">
                Start drafting
              </Button>
            </>
          )}
          <button
            className="p-2 text-zinc-700 lg:hidden dark:text-zinc-300"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-zinc-300 bg-zinc-50 lg:hidden dark:border-zinc-700 dark:bg-zinc-950"
          >
            <div className="divide-y divide-zinc-200 px-5 dark:divide-zinc-800">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex items-baseline gap-3 py-3 text-zinc-800 dark:text-zinc-200">
                  <span className="font-mono text-[10px] text-zinc-400">{l.n}</span>
                  {l.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 py-4">
                {user ? (
                  <Button to="/app" className="col-span-2">
                    Open workspace
                  </Button>
                ) : (
                  <>
                    <Button to="/login" variant="secondary">
                      Sign in
                    </Button>
                    <Button to="/register">Start drafting</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// The footer is laid out like a drawing's title block: ruled cells with
// small uppercase field labels.
export function MarketingFooter() {
  const year = new Date().getFullYear();
  const cell = 'border-zinc-300 p-5 dark:border-zinc-700';
  return (
    <footer className="border-t border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid border border-zinc-900 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] dark:border-zinc-100">
          <div className={cn(cell, 'border-b sm:border-r lg:border-b-0')}>
            <p className="label-mono">Drawn by</p>
            <div className="mt-3 flex items-center gap-3">
              <LogoMark className="size-9" />
              <div>
                <p className="display text-2xl leading-none text-zinc-900 dark:text-zinc-50">DiagramForge</p>
                <p className="mt-1 text-xs text-zinc-500">Team D11 · Amrita Vishwa Vidyapeetham</p>
              </div>
            </div>
          </div>
          <div className={cn(cell, 'border-b lg:border-r lg:border-b-0')}>
            <p className="label-mono">Product</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[['Capabilities', '#capabilities'], ['Process', '#process'], ['Legend', '#legend'], ['Notes', '#notes']].map(([l, h]) => (
                <li key={l}><a className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400" href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div className={cn(cell, 'border-b sm:border-r sm:border-b-0')}>
            <p className="label-mono">Workspace</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[['Sign in', '/login'], ['Create account', '/register'], ['Open dashboard', '/app']].map(([l, h]) => (
                <li key={l}><a className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400" href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div className={cell}>
            <p className="label-mono">Course</p>
            <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">22AIE305 — Introduction to Cloud Computing</p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">REV. {year}.{String(new Date().getMonth() + 1).padStart(2, '0')} · SCALE 1:1</p>
          </div>
        </div>
        <p className="mt-4 text-center font-mono text-[10.5px] tracking-wider text-zinc-500 uppercase">© {year} DiagramForge · All diagrams are yours</p>
      </div>
    </footer>
  );
}
