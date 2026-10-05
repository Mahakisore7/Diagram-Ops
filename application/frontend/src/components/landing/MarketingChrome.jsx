import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu as MenuIcon, Moon, Sun, X } from 'lucide-react';
import Logo from '../brand/Logo';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
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
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/75'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolved === 'dark' ? <Sun /> : <Moon />}
          </Button>
          {user ? (
            <Button to="/app" size="sm" className="hidden sm:inline-flex">
              Open dashboard <ArrowRight />
            </Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button to="/register" size="sm" className="hidden sm:inline-flex">
                Get started free
              </Button>
            </>
          )}
          <button
            className="rounded-md p-2 text-zinc-600 md:hidden dark:text-zinc-400"
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="space-y-1 px-4 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {l.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {user ? (
                  <Button to="/app" className="col-span-2">
                    Open dashboard
                  </Button>
                ) : (
                  <>
                    <Button to="/login" variant="secondary">
                      Sign in
                    </Button>
                    <Button to="/register">Get started</Button>
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

export function MarketingFooter() {
  const year = new Date().getFullYear();
  const columns = [
    { title: 'Product', links: [['Features', '#features'], ['How it works', '#how-it-works'], ['Diagram types', '#types'], ['FAQ', '#faq']] },
    { title: 'Platform', links: [['Security', '#security'], ['DevSecOps pipeline', '#security'], ['Status', '/healthz']] },
    { title: 'Account', links: [['Sign in', '/login'], ['Create account', '/register'], ['Dashboard', '/app']] },
  ];
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            Turn plain-English descriptions into production-ready diagrams. Built cloud-native, shipped through a
            security-gated pipeline.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {year} DiagramForge · Team D11, Amrita Vishwa Vidyapeetham</p>
          <p>22AIE305 Introduction to Cloud Computing</p>
        </div>
      </div>
    </footer>
  );
}
