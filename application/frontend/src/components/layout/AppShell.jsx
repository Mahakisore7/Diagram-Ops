import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ChevronsUpDown,
  HelpCircle,
  Keyboard,
  LayoutDashboard,
  Library,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
  X,
} from 'lucide-react';
import Logo from '../brand/Logo';
import Button from '../ui/Button';
import { Avatar, Kbd } from '../ui/primitives';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import CommandPalette from './CommandPalette';
import ShortcutsDialog from './ShortcutsDialog';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useHotkey } from '../../hooks/useHotkey';
import { cn, displayName, modKey } from '../../lib/utils';
import { systemApi } from '../../api';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/new', label: 'Studio', icon: Sparkles },
  { to: '/app/diagrams', label: 'Library', icon: Library, end: true },
  { to: '/app/diagrams?favorite=true', label: 'Favourites', icon: Star, match: 'favorite=true' },
  { to: '/app/activity', label: 'Activity', icon: Activity },
];

function SidebarNav({ onNavigate }) {
  const location = useLocation();
  return (
    <nav className="space-y-0.5" aria-label="Main">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => {
              // Library and Favourites share a path; the query string decides.
              const favActive = location.search.includes('favorite=true');
              const active = item.match ? favActive && isActive : isActive && !(item.to === '/app/diagrams' && favActive);
              return cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700'
                  : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
              );
            }}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

// Shows how much of today's paid-fallback budget is used. Status colours
// ship with a text label, never colour alone.
function UsageMeter() {
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    systemApi.providerStatus().then(setUsage).catch(() => setUsage(null));
  }, []);
  if (!usage) return null;
  const pct = usage.cap > 0 ? Math.min(100, Math.round((usage.count / usage.cap) * 100)) : 0;
  const tone = pct >= 90 ? 'var(--viz-critical)' : pct >= 70 ? 'var(--viz-warning)' : 'var(--viz-good)';
  const label = pct >= 90 ? 'Near limit' : pct >= 70 ? 'Elevated' : 'Healthy';
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Fallback AI budget</span>
        <span className="text-zinc-500">{label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500 tabular-nums">
        {usage.count} / {usage.cap} Claude calls today
      </p>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  return (
    <Menu
      align="left"
      rootClassName="block w-full"
      className="bottom-full mt-0 mb-2 w-60"
      trigger={({ toggle: open, ...aria }) => (
        <button
          onClick={open}
          {...aria}
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60"
        >
          <Avatar user={user} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName(user)}</span>
            <span className="block truncate text-xs text-zinc-500">{user?.email}</span>
          </span>
          <ChevronsUpDown className="size-4 text-zinc-400" />
        </button>
      )}
    >
      <MenuLabel>Signed in as {user?.email}</MenuLabel>
      <MenuItem icon={User} onClick={() => navigate('/app/settings/profile')}>
        Profile
      </MenuItem>
      <MenuItem icon={Settings} onClick={() => navigate('/app/settings')}>
        Settings
      </MenuItem>
      <MenuItem icon={resolved === 'dark' ? Sun : Moon} onClick={toggle}>
        {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        icon={LogOut}
        danger
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        Sign out
      </MenuItem>
    </Menu>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <Logo to="/app" />
      </div>
      <Button to="/app/new" variant="primary" className="w-full" onClick={onNavigate}>
        <Sparkles /> New diagram
      </Button>
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <UsageMeter />
        <UserMenu />
      </div>
    </div>
  );
}

export default function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const lastKey = useRef(null);

  useHotkey('mod+k', () => setPaletteOpen((o) => !o));
  useHotkey('?', () => setShortcutsOpen(true));

  // Two-key "g n" chord for a new diagram, GitHub-style.
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (lastKey.current === 'g' && key === 'n') navigate('/app/new');
      lastKey.current = key;
      setTimeout(() => (lastKey.current = null), 800);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-zinc-100/60 lg:block dark:border-zinc-800 dark:bg-zinc-900/40">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-5 right-4 rounded-md p-1 text-zinc-500"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-zinc-600 lg:hidden dark:text-zinc-400"
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <Logo compact to="/app" className="lg:hidden" />
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 transition hover:border-zinc-300 sm:ml-0 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <span className="hidden gap-1 sm:flex">
              <Kbd>{modKey}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={showShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
              <Keyboard />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title="Toggle theme"
            >
              {resolved === 'dark' ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="icon" to="/#faq" aria-label="Help" title="Help">
              <HelpCircle />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onShowShortcuts={showShortcuts} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
