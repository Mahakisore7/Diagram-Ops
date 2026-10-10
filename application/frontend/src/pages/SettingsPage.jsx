import { useEffect, useState } from 'react';
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check, Database, Download, KeyRound, LogOut, Monitor, Moon, Palette, ShieldCheck, Shuffle, Sun, Trash2, User } from 'lucide-react';
import { authApi, systemApi } from '../api';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Button from '../components/ui/Button';
import { Field, Input, PasswordInput, Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/Modal';
import { Badge, Card, PageHeader, Skeleton } from '../components/ui/primitives';
import PasswordStrength from '../components/auth/PasswordStrength';
import { meetsPasswordRules } from '../lib/password';
import ActivityItem from '../components/activity/ActivityItem';
import { DIAGRAM_TYPES, TYPE_KEYS } from '../lib/diagramTypes';
import { downloadText } from '../lib/exporters';
import { cn, formatDate } from '../lib/utils';
import { AVATAR_STYLES, DEFAULT_STYLE, avatarDataUri, randomSeed } from '../lib/avatars';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Security', icon: ShieldCheck },
  { key: 'preferences', label: 'Preferences', icon: Palette },
  { key: 'data', label: 'Data & privacy', icon: Database },
];

function Section({ title, description, children, footer }) {
  return (
    <Card>
      <div className="grid gap-6 p-6 md:grid-cols-[16rem_1fr]">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
        <div className="space-y-5">{children}</div>
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">{footer}</div>}
    </Card>
  );
}

// Avatar studio: pick a drawing style, then flip through generated faces.
// Six candidates per page; "Shuffle" draws six new seeds.
function AvatarPicker({ value, onChange }) {
  const [candidates, setCandidates] = useState(() => [value.seed, ...Array.from({ length: 5 }, randomSeed)]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Avatar style">
        {Object.entries(AVATAR_STYLES).map(([key, def]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value.style === key}
            onClick={() => onChange({ ...value, style: key })}
            className={cn(
              'border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition',
              value.style === key
                ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                : 'border-zinc-300 text-zinc-600 hover:border-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-300',
            )}
          >
            {def.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {candidates.map((seed) => {
          const selected = seed === value.seed;
          return (
            <button
              key={seed}
              type="button"
              onClick={() => onChange({ ...value, seed })}
              aria-label={`Choose avatar ${seed}`}
              aria-pressed={selected}
              className={cn(
                'relative border p-1 transition',
                selected ? 'border-brand-600 dark:border-brand-400' : 'border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-300',
              )}
            >
              <img src={avatarDataUri(value.style, seed)} alt="" className="size-14 bg-zinc-100 dark:bg-zinc-800" draggable={false} />
              {selected && <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center bg-brand-600 text-white"><Check className="size-3" /></span>}
            </button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCandidates([value.seed, ...Array.from({ length: 5 }, randomSeed)])}
        >
          <Shuffle /> Shuffle
        </Button>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const initialAvatar = {
    style: user.avatar?.style || DEFAULT_STYLE,
    seed: user.avatar?.seed || user.email,
  };
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const avatarChanged = avatar.style !== initialAvatar.style || avatar.seed !== initialAvatar.seed;
  const dirty = name.trim() !== (user.name || '') || avatarChanged;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({ name: name.trim(), ...(avatarChanged ? { avatar } : {}) });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not update profile', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Section
        title="Portrait"
        description="A generated, illustrated avatar. Nothing is uploaded — only the style and seed are saved."
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-start border border-zinc-900 bg-white p-2 shadow-[5px_5px_0_0_var(--color-zinc-900)] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0_0_rgb(4_14_26/0.7)]">
            <img src={avatarDataUri(avatar.style, avatar.seed)} alt="Your avatar" className="size-28 bg-zinc-100 dark:bg-zinc-800" draggable={false} />
            <p className="mt-2 text-center font-mono text-[9px] tracking-widest text-zinc-500 uppercase">Fig. — You</p>
          </div>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </div>
      </Section>
      <Section
        title="Personal information"
        description="How you appear across DiagramForge."
        footer={
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar user={user} src={avatarDataUri(avatar.style, avatar.seed)} size="md" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{name.trim() || user.email}</p>
            <p className="text-sm text-zinc-500">Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <Field label="Display name" hint="Up to 80 characters.">
          {(props) => <Input {...props} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />}
        </Field>
        <Field label="Email address" hint="Your email is your sign-in identifier and can't be changed here.">
          {(props) => <Input {...props} value={user.email} disabled />}
        </Field>
      </Section>
    </form>
  );
}

function SecurityTab() {
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    systemApi
      .activity(100)
      .then((all) => setEvents(all.filter((e) => e.action.startsWith('auth.')).slice(0, 8)))
      .catch(() => setEvents([]));
  }, []);

  const mismatch = confirm && next !== confirm;
  const canSubmit = current && meetsPasswordRules(next) && next === confirm;

  async function changePassword(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Password changed', 'Use your new password next time you sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={changePassword}>
        <Section
          title="Change password"
          description="You'll need your current password. Use at least 8 characters with a letter and a number."
          footer={
            <Button type="submit" loading={saving} disabled={!canSubmit}>
              <KeyRound /> Update password
            </Button>
          }
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          <Field label="Current password">
            {(props) => <PasswordInput {...props} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />}
          </Field>
          <Field label="New password">
            {(props) => <PasswordInput {...props} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />}
          </Field>
          <PasswordStrength password={next} />
          <Field label="Confirm new password" error={mismatch ? 'Passwords do not match.' : undefined}>
            {(props) => <PasswordInput {...props} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />}
          </Field>
        </Section>
      </form>

      <Section title="Recent sign-in activity" description="Sign-ins and failed attempts on your account, with device and IP address.">
        {events === null ? (
          <Skeleton className="h-32" />
        ) : events.length === 0 ? (
          <p className="text-sm text-zinc-500">No sign-in activity recorded yet.</p>
        ) : (
          <ul>
            {events.map((e, i) => (
              <ActivityItem key={e._id} event={e} showDevice isLast={i === events.length - 1} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Session" description="Sessions use signed tokens that expire automatically.">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign out of DiagramForge on this device.</p>
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}

function PreferencesTab() {
  const { preference, setPreference } = useTheme();
  const [defaultType, setDefaultType] = useLocalStorage('diagramforge_default_type', '');
  const themes = [
    ['light', 'Light', Sun],
    ['dark', 'Dark', Moon],
    ['system', 'System', Monitor],
  ];
  return (
    <div className="space-y-6">
      <Section title="Appearance" description="Choose how DiagramForge looks on this device.">
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {themes.map(([key, label, Icon]) => (
            <button
              key={key}
              role="radio"
              aria-checked={preference === key}
              onClick={() => setPreference(key)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition',
                preference === key
                  ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50',
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Studio defaults" description="Saved in this browser.">
        <Field label="Default diagram type" hint="Pre-selected every time you open the Studio.">
          {(props) => (
            <Select {...props} value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
              <option value="">Auto — let the AI decide</option>
              {TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {DIAGRAM_TYPES[k].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Section>
    </div>
  );
}

function DataTab() {
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');

  async function exportData() {
    setExporting(true);
    try {
      const data = await authApi.exportData();
      downloadText(JSON.stringify(data, null, 2), `diagramforge-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      toast.success('Export ready', `${data.diagrams.length} diagram${data.diagrams.length === 1 ? '' : 's'} exported.`);
    } catch (err) {
      toast.error('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Export your data" description="Download your profile and every diagram (including source and metadata) as a single JSON file.">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Format: <Badge>diagramforge-export/v1</Badge>
          </p>
          <Button variant="secondary" onClick={exportData} loading={exporting}>
            <Download /> Export JSON
          </Button>
        </div>
      </Section>

      <Card className="border-red-200 dark:border-red-900/50">
        <div className="grid gap-6 p-6 md:grid-cols-[16rem_1fr]">
          <div>
            <h2 className="font-semibold text-red-600 dark:text-red-400">Delete account</h2>
            <p className="mt-1 text-sm text-zinc-500">Permanently delete your account, all diagrams, versions, share links and activity history.</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">This cannot be undone. Consider exporting your data first.</p>
            <Button variant="danger-outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete account
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setPassword('');
        }}
        onConfirm={async () => {
          try {
            await authApi.deleteAccount(password);
            logout();
            toast.success('Account deleted', 'All of your data has been removed.');
            navigate('/');
          } catch (err) {
            toast.error('Could not delete account', err.message);
            throw err;
          }
        }}
        title="Delete your account?"
        description="Every diagram, version, share link and activity record will be permanently erased."
        confirmLabel="Delete my account"
        confirmText="DELETE"
      >
        <div className="mt-4">
          <Field label="Confirm with your password">
            {(props) => <PasswordInput {...props} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />}
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default function SettingsPage() {
  const { tab = 'profile' } = useParams();
  useDocumentTitle('Settings');
  const active = TABS.find((t) => t.key === tab);
  if (!active) return <Navigate to="/app/settings/profile" replace />;

  const content = { profile: <ProfileTab />, security: <SecurityTab />, preferences: <PreferencesTab />, data: <DataTab /> }[tab];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, security and data." />
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Settings sections">
          {TABS.map((t) => (
            <NavLink
              key={t.key}
              to={`/app/settings/${t.key}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition',
                  isActive
                    ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
                )
              }
            >
              <t.icon className="size-4" /> {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {content}
    </div>
  );
}
