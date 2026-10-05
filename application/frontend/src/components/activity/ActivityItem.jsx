import { Link } from 'react-router-dom';
import { activityMeta, TONE_CLASSES } from '../../lib/activity';
import { cn, describeUserAgent, formatDateTime, timeAgo } from '../../lib/utils';

export default function ActivityItem({ event, showDevice = false, isLast = false }) {
  const meta = activityMeta(event.action);
  const Icon = meta.icon;
  const isDiagram = meta.category === 'diagram';
  const linkable = isDiagram && event.action !== 'diagram.delete' && event.targetId;

  return (
    <li className="relative flex gap-3 pb-5">
      {!isLast && <span className="absolute top-9 bottom-0 left-4 w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />}
      <span className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-900', TONE_CLASSES[meta.tone])}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {meta.label}
          {isDiagram && event.targetTitle && (
            <>
              {' '}
              {linkable ? (
                <Link to={`/app/diagrams/${event.targetId}`} className="font-medium text-zinc-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                  {event.targetTitle}
                </Link>
              ) : (
                <span className="font-medium text-zinc-900 dark:text-white">{event.targetTitle}</span>
              )}
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500" title={formatDateTime(event.createdAt)}>
          {timeAgo(event.createdAt)}
          {showDevice && (
            <>
              {' · '}
              {describeUserAgent(event.userAgent)}
              {event.ip && <> · <span className="font-mono">{event.ip}</span></>}
            </>
          )}
        </p>
      </div>
    </li>
  );
}
