import { useState } from 'react';
import { motion } from 'motion/react';
import { typeMeta } from '../../lib/diagramTypes';
import { formatDate } from '../../lib/utils';

// Charts follow the dataviz method: single-series charts use one hue
// (--viz-series-1) and are named by their card title (no legend); the
// two-series provider split has a legend + direct labels. Bars are
// <= 24px thick with 4px rounded data-ends, square at the baseline, text
// stays in ink colours, and every mark has a hover tooltip.

function Tooltip({ x, y, children }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      style={{ left: x, top: y - 8 }}
      role="tooltip"
    >
      {children}
    </div>
  );
}

// 14-day column chart of diagrams created per day.
export function ActivityChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const height = 160;
  const niceMax = max <= 4 ? max : Math.ceil(max / 2) * 2;

  return (
    <div className="relative">
      <div className="flex">
        {/* Y axis: just the top and zero labels - recessive */}
        <div className="flex w-6 flex-col justify-between pb-6 text-right text-[10px] text-zinc-400 tabular-nums" style={{ height: height + 24 }}>
          <span>{niceMax}</span>
          <span>0</span>
        </div>
        <div className="relative ml-2 flex-1">
          <div className="absolute inset-x-0 top-0 border-t border-dashed" style={{ borderColor: 'var(--viz-grid)' }} aria-hidden />
          <div className="absolute inset-x-0 border-t" style={{ top: height, borderColor: 'var(--viz-grid)' }} aria-hidden />
          <div className="flex items-end gap-1" style={{ height }}>
            {data.map((d, i) => {
              const h = d.count === 0 ? 0 : Math.max(4, (d.count / niceMax) * height);
              return (
                <div
                  key={d.date}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parent = e.currentTarget.parentElement.getBoundingClientRect();
                    setHover({ i, x: rect.left - parent.left + rect.width / 2 + 32, y: height - h });
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="absolute inset-0 rounded-md transition group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/60" aria-hidden />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: h }}
                    transition={{ delay: i * 0.025, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-6 rounded-t"
                    style={{ background: 'var(--viz-series-1)' }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
            <span>{formatDate(data[0]?.date, { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </div>
      </div>
      {hover && (
        <Tooltip x={hover.x} y={hover.y}>
          <span className="font-medium text-zinc-900 dark:text-white">{data[hover.i].count}</span>{' '}
          <span className="text-zinc-500">
            diagram{data[hover.i].count === 1 ? '' : 's'} · {formatDate(data[hover.i].date, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </Tooltip>
      )}
      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Diagrams created per day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th>{d.date}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Horizontal bars: diagrams per type, sorted, value at the bar tip.
export function TypeBreakdown({ byType }) {
  const rows = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">No diagrams yet</p>;
  return (
    <ul className="space-y-3">
      {rows.map(([type, count], i) => {
        const meta = typeMeta(type);
        return (
          <li key={type} className="group" title={`${meta.label}: ${count}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <meta.icon className="size-3.5 text-zinc-400" />
                {meta.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2.5 flex-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / max) * 100}%` }}
                  transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-r transition-opacity group-hover:opacity-80"
                  style={{ background: 'var(--viz-series-1)' }}
                />
              </div>
              <span className="w-6 text-right text-xs font-medium text-zinc-600 tabular-nums dark:text-zinc-400">{count}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Two-series stacked bar: which AI provider produced the saved diagrams.
export function ProviderSplit({ byProvider }) {
  const groq = byProvider.groq || 0;
  const claude = byProvider.claude || 0;
  const total = groq + claude;
  if (total === 0) return <p className="py-4 text-center text-sm text-zinc-500">No generations yet</p>;
  const series = [
    { key: 'groq', label: 'Groq (primary)', value: groq, color: 'var(--viz-series-1)' },
    { key: 'claude', label: 'Claude (fallback)', value: claude, color: 'var(--viz-series-2)' },
  ];
  return (
    <div>
      {/* 2px surface gap between segments */}
      <div className="flex h-3 gap-0.5 overflow-hidden rounded">
        {series
          .filter((s) => s.value > 0)
          .map((s) => (
            <motion.div
              key={s.key}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.6 }}
              style={{ background: s.color }}
              title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
