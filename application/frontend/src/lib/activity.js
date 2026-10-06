import {
  Copy,
  Download,
  FilePlus2,
  KeyRound,
  Link2,
  Link2Off,
  LogIn,
  PencilLine,
  ShieldAlert,
  Trash2,
  UserPen,
  UserPlus,
} from 'lucide-react';

// Presentation for each audit action emitted by the backend's
// services/activityService.js ACTIONS map.
const ACTIONS = {
  'auth.register': { icon: UserPlus, label: 'Created the account', tone: 'brand', category: 'security' },
  'auth.login': { icon: LogIn, label: 'Signed in', tone: 'neutral', category: 'security' },
  'auth.login_failed': { icon: ShieldAlert, label: 'Failed sign-in attempt', tone: 'danger', category: 'security' },
  'auth.password_change': { icon: KeyRound, label: 'Changed the password', tone: 'warning', category: 'security' },
  'profile.update': { icon: UserPen, label: 'Updated the profile', tone: 'neutral', category: 'account' },
  'account.export': { icon: Download, label: 'Exported account data', tone: 'neutral', category: 'account' },
  'diagram.create': { icon: FilePlus2, label: 'Created', tone: 'success', category: 'diagram' },
  'diagram.update': { icon: PencilLine, label: 'Edited', tone: 'neutral', category: 'diagram' },
  'diagram.delete': { icon: Trash2, label: 'Deleted', tone: 'danger', category: 'diagram' },
  'diagram.duplicate': { icon: Copy, label: 'Duplicated into', tone: 'neutral', category: 'diagram' },
  'diagram.share': { icon: Link2, label: 'Shared publicly', tone: 'brand', category: 'diagram' },
  'diagram.unshare': { icon: Link2Off, label: 'Revoked the share link for', tone: 'warning', category: 'diagram' },
};

export function activityMeta(action) {
  return ACTIONS[action] || { icon: PencilLine, label: action, tone: 'neutral', category: 'other' };
}

export const TONE_CLASSES = {
  neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};
