import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  CornerDownLeft,
  FileText,
  Keyboard,
  LayoutDashboard,
  Library,
  LogOut,
  Moon,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { diagramsApi } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { Kbd } from '../ui/primitives';

// Ctrl/Cmd+K launcher: jump to any page, run common actions, or search
// diagrams by title (server-side search, debounced).
export default function CommandPalette({ open, onClose, onShowShortcuts }) {
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const debounced = useDebounce(query, 200);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    diagramsApi
      .list({ q: debounced.trim(), limit: 6 })
      .then((res) => !cancelled && setResults(res.data))
      .catch(() => !cancelled && setResults([]));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const actions = useMemo(
    () => [
      { id: 'new', label: 'New diagram', icon: Sparkles, group: 'Actions', run: () => navigate('/app/new') },
      { id: 'dash', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigate', run: () => navigate('/app') },
      { id: 'lib', label: 'Go to Library', icon: Library, group: 'Navigate', run: () => navigate('/app/diagrams') },
      { id: 'fav', label: 'Show favourites', icon: Star, group: 'Navigate', run: () => navigate('/app/diagrams?favorite=true') },
      { id: 'act', label: 'Go to Activity', icon: Activity, group: 'Navigate', run: () => navigate('/app/activity') },
      { id: 'set', label: 'Open Settings', icon: Settings, group: 'Navigate', run: () => navigate('/app/settings') },
      {
        id: 'theme',
        label: resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        icon: resolved === 'dark' ? Sun : Moon,
        group: 'Preferences',
        run: toggle,
      },
      { id: 'keys', label: 'Keyboard shortcuts', icon: Keyboard, group: 'Help', run: onShowShortcuts },
      {
        id: 'out',
        label: 'Sign out',
        icon: LogOut,
        group: 'Account',
        run: () => {
          logout();
          navigate('/login');
        },
      },
    ],
    [navigate, resolved, toggle, logout, onShowShortcuts],
  );

  const q = query.trim().toLowerCase();
  const filtered = actions.filter((a) => !q || a.label.toLowerCase().includes(q));
  const items = [
    ...results.map((d) => ({
      id: `d-${d._id}`,
      label: d.title,
      icon: FileText,
      group: 'Diagrams',
      run: () => navigate(`/app/diagrams/${d._id}`),
    })),
    ...filtered,
  ];

  function runItem(item) {
    onClose();
    item?.run();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(items[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  let lastGroup = null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
              <Search className="size-4 text-zinc-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search diagrams or type a command…"
                className="h-14 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
                aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
              />
              <Kbd>Esc</Kbd>
            </div>
            <ul id="command-list" role="listbox" className="thin-scrollbar max-h-80 overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">No results for “{query}”</li>}
              {items.map((item, index) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                const Icon = item.icon;
                return (
                  <li key={item.id} role="presentation">
                    {header && <div className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-400">{header}</div>}
                    <button
                      id={`cmd-${item.id}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => runItem(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                        index === active
                          ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-white'
                          : 'text-zinc-700 dark:text-zinc-300',
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {index === active && <CornerDownLeft className="size-3.5 opacity-50" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
