import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, FileStack, Gauge, Link2, Plus, Sparkles, Star, Tag } from 'lucide-react';
import { diagramsApi, systemApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Button from '../components/ui/Button';
import { Card, CardHeader, EmptyState, Skeleton } from '../components/ui/primitives';
import { ActivityChart, ProviderSplit, TypeBreakdown } from '../components/dashboard/Charts';
import ActivityItem from '../components/activity/ActivityItem';
import DiagramThumbnail from '../components/diagram/DiagramThumbnail';
import TypeBadge, { TypeIcon } from '../components/diagram/TypeBadge';
import { TEMPLATES } from '../lib/diagramTypes';
import { displayName, formatMs, timeAgo } from '../lib/utils';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function StatTile({ icon: Icon, label, value, sub, delay = 0, to }) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group h-full rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="display mt-3 text-5xl leading-none text-zinc-900 tabular-nums dark:text-zinc-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </motion.div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([diagramsApi.stats(), diagramsApi.list({ limit: 4, sort: 'updated' }), systemApi.activity(6)])
      .then(([s, r, e]) => {
        setStats(s);
        setRecent(r.data);
        setEvents(e);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loading = !stats && !error;
  const thisWeek = stats ? stats.activity.slice(-7).reduce((sum, d) => sum + d.count, 0) : 0;
  const lastWeek = stats ? stats.activity.slice(0, 7).reduce((sum, d) => sum + d.count, 0) : 0;
  const weekDelta = thisWeek - lastWeek;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono">{greeting()} · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="display mt-2 text-5xl leading-none text-zinc-900 dark:text-zinc-50">
            Hello, <span className="italic">{displayName(user)}.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button to="/app/diagrams" variant="secondary">
            View library
          </Button>
          <Button to="/app/new">
            <Plus /> New diagram
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)
        ) : (
          <>
            <StatTile icon={FileStack} label="Total diagrams" value={stats?.total ?? 0} sub={`${thisWeek} created this week`} to="/app/diagrams" />
            <StatTile
              icon={Sparkles}
              label="This week"
              value={thisWeek}
              sub={weekDelta === 0 ? 'Same as last week' : `${weekDelta > 0 ? '+' : ''}${weekDelta} vs. last week`}
              delay={0.05}
            />
            <StatTile icon={Star} label="Favourites" value={stats?.favorites ?? 0} sub={`${stats?.shared ?? 0} shared publicly`} delay={0.1} to="/app/diagrams?favorite=true" />
            <StatTile icon={Gauge} label="Avg. generation time" value={formatMs(stats?.avgGenerationMs)} sub="Across saved diagrams" delay={0.15} />
          </>
        )}
      </div>

      {!loading && stats?.total === 0 ? (
        <Card>
          <EmptyState
            className="border-0"
            icon={Sparkles}
            title="Create your first diagram"
            description="Describe a system in plain English or start from one of the templates below. It takes about ten seconds."
            action={
              <Button to="/app/new" variant="gradient">
                <Sparkles /> Open the Studio
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Diagrams created" description="Last 14 days" />
            <div className="p-5">{loading ? <Skeleton className="h-48" /> : <ActivityChart data={stats.activity} />}</div>
          </Card>
          <Card>
            <CardHeader title="By diagram type" />
            <div className="p-5">{loading ? <Skeleton className="h-48" /> : <TypeBreakdown byType={stats.byType} />}</div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recently edited"
            action={
              <Link to="/app/diagrams" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {recent === null
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)
              : recent.length === 0
                ? <p className="col-span-2 py-6 text-center text-sm text-zinc-500">Nothing here yet.</p>
                : recent.map((d) => (
                    <Link
                      key={d._id}
                      to={`/app/diagrams/${d._id}`}
                      className="group overflow-hidden rounded-xl border border-zinc-200 transition hover:border-brand-300 hover:shadow-md dark:border-zinc-800 dark:hover:border-brand-500/50"
                    >
                      <DiagramThumbnail syntax={d.mermaidSyntax} className="h-28" />
                      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{d.title}</p>
                          <p className="text-xs text-zinc-500">{timeAgo(d.updatedAt)}</p>
                        </div>
                        <TypeBadge type={d.diagramType} />
                      </div>
                    </Link>
                  ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Link to="/app/activity" className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
                  View all
                </Link>
              }
            />
            <ul className="p-5 pb-0">
              {events === null
                ? [0, 1, 2].map((i) => <Skeleton key={i} className="mb-4 h-10" />)
                : events.map((e, i) => <ActivityItem key={e._id} event={e} isLast={i === events.length - 1} />)}
            </ul>
          </Card>
          {stats && stats.total > 0 && (
            <Card>
              <CardHeader title="AI provider usage" description="Which model generated your saved diagrams" />
              <div className="p-5">
                <ProviderSplit byProvider={stats.byProvider} />
              </div>
            </Card>
          )}
          {stats?.tags?.length > 0 && (
            <Card>
              <CardHeader title="Top tags" />
              <div className="flex flex-wrap gap-2 p-5">
                {stats.tags.slice(0, 12).map((t) => (
                  <Link
                    key={t.tag}
                    to={`/app/diagrams?tag=${encodeURIComponent(t.tag)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-brand-300"
                  >
                    <Tag className="size-3" /> {t.tag}
                    <span className="text-zinc-400 tabular-nums">{t.count}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Start from a template</h2>
          <Link to="/app/new" className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Open Studio
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Link
              key={t.title}
              to="/app/new"
              state={{ template: t }}
              className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-brand-500/50"
            >
              <TypeIcon type={t.type} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-medium text-zinc-900 dark:text-white">
                  {t.title}
                  <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{t.prompt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {stats?.shared > 0 && (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Link2 className="size-3.5" /> {stats.shared} diagram{stats.shared === 1 ? ' is' : 's are'} publicly shared. Manage links from each diagram&apos;s Share menu.
        </p>
      )}
    </div>
  );
}
