import { useEffect, useMemo, useState } from 'react';
import { Activity, ShieldAlert } from 'lucide-react';
import { systemApi } from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ActivityItem from '../components/activity/ActivityItem';
import { Card, EmptyState, PageHeader, Skeleton } from '../components/ui/primitives';
import { activityMeta } from '../lib/activity';
import { cn, formatDate } from '../lib/utils';

const FILTERS = [
  ['all', 'All activity'],
  ['diagram', 'Diagrams'],
  ['security', 'Security'],
  ['account', 'Account'],
];

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(d, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ActivityPage() {
  useDocumentTitle('Activity');
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    systemApi.activity(100).then(setEvents).catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () => (events || []).filter((e) => filter === 'all' || activityMeta(e.action).category === filter),
    [events, filter],
  );
  const failedLogins = (events || []).filter((e) => e.action === 'auth.login_failed').length;

  // Group into days for a scannable timeline.
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = new Date(e.createdAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="An audit trail of sign-ins, account changes and diagram events. Kept for 90 days." />

      {failedLogins > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>{failedLogins} failed sign-in attempt{failedLogins === 1 ? '' : 's'}</strong> in the recent history. If these weren&apos;t you,
            change your password in Settings → Security.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter activity">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              filter === key
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {events === null && !error ? (
        <Card className="space-y-4 p-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Events will appear here as you use DiagramForge." />
      ) : (
        <div className="space-y-6">
          {groups.map(([key, list]) => (
            <Card key={key} className="p-6">
              <h2 className="mb-4 text-xs font-semibold tracking-wider text-zinc-400 uppercase">{dayLabel(list[0].createdAt)}</h2>
              <ul>
                {list.map((e, i) => (
                  <ActivityItem key={e._id} event={e} showDevice isLast={i === list.length - 1} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
