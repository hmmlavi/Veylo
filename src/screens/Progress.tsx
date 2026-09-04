import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingDown, TrendingUp, Minus as MinusIcon } from 'lucide-react';
import { useHabo } from '../lib/store';
import { daysAgo, weekdayLetter } from '../lib/dates';
import { bestStreakOverall, buckets, insights, periodStat, activeHabits } from '../lib/stats';
import { EmptyState } from '../components/ui';

type Range = 'week' | 'month' | 'year';
const RANGES: { id: Range; label: string; days: number; n: number }[] = [
  { id: 'week', label: 'This Week', days: 7, n: 7 },
  { id: 'month', label: 'This Month', days: 30, n: 6 },
  { id: 'year', label: 'This Year', days: 365, n: 12 },
];

export default function Progress() {
  const { data } = useHabo();
  const [range, setRange] = useState<Range>('week');
  const cfg = RANGES.find((r) => r.id === range)!;

  const stat = useMemo(() => periodStat(data, cfg.days), [data, cfg.days]);
  const best = useMemo(() => bestStreakOverall(data), [data]);
  const chart = useMemo(() => buckets(data, cfg.days, cfg.n), [data, cfg.days, cfg.n]);
  const tips = useMemo(() => insights(data), [data]);
  const hasHabits = activeHabits(data).length > 0;
  const missed = stat.total - stat.done;

  const labelFor = (i: number): string => {
    if (range === 'week') return weekdayLetter(daysAgo(cfg.n - 1 - i).getDay());
    const b = chart[i];
    if (range === 'month') return `${b.to.getMonth() + 1}/${b.to.getDate()}`;
    return ['J','F','M','A','M','J','J','A','S','O','N','D'][b.to.getMonth()];
  };

  const delta = stat.delta;
  const deltaTxt = `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`;

  if (!hasHabits) {
    return (
      <div className="flex h-full flex-col px-4 pt-5">
        <h1 className="px-1 text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Progress</h1>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState title="Not enough data yet" sub="Keep tracking and Veylo will start finding your patterns." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-5">
      <h1 className="px-1 text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Progress</h1>

      {/* range filter */}
      <div className="mt-4 flex gap-1 rounded-full bg-[var(--surface-2)] p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className="relative h-9 flex-1 rounded-full text-[12.5px] font-semibold transition-colors"
            style={{ color: range === r.id ? 'var(--on-accent)' : 'var(--muted)' }}
          >
            {range === r.id && (
              <motion.span
                layoutId="range-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--accent)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{r.label}</span>
          </button>
        ))}
      </div>

      {/* main stat */}
      <div className="mt-6 px-1">
        <div className="flex items-end gap-2">
          <motion.span
            key={`${range}-${Math.round(stat.rate * 100)}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[44px] font-bold leading-none tabular-nums"
            style={{ color: 'var(--text)' }}
          >
            {Math.round(stat.rate * 100)}%
          </motion.span>
          <span className="pb-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>consistency</span>
        </div>
      </div>

      {/* stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          { k: 'Best streak', v: `${best}`, sub: 'days', icon: null },
          { k: 'Completed', v: `${stat.done}`, sub: `of ${stat.total}`, icon: null },
          {
            k: 'Improvement', v: deltaTxt, sub: 'vs before',
            icon: delta > 0.005 ? TrendingUp : delta < -0.005 ? TrendingDown : MinusIcon,
          },
          { k: 'Missed', v: `${missed}`, sub: range === 'week' ? 'days this week' : 'check-ins', icon: null },
        ].map((t) => (
          <div key={t.k} className="rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>
              {t.icon && <t.icon size={12} style={{ color: delta >= 0 ? 'var(--good)' : 'var(--danger)' }} />}
              {t.k}
            </div>
            <div className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>
              {t.v} <span className="text-[12px] font-medium" style={{ color: 'var(--muted)' }}>{t.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* chart */}
      <div className="mt-5 rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>
          {range === 'week' ? 'Daily completion' : range === 'month' ? 'Completion by 5-day block' : 'Completion by month'}
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {chart.map((b, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="relative w-full flex-1 overflow-hidden rounded-[7px]" style={{ background: 'var(--surface-2)' }}>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-[7px]"
                  style={{ background: 'color-mix(in srgb, var(--fill) 82%, transparent)' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(b.rate * 100, b.rate > 0 ? 6 : 0)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22, delay: i * 0.03 }}
                />
              </div>
              <span className="text-[9.5px] font-medium uppercase" style={{ color: 'var(--faint)' }}>{labelFor(i)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* insights */}
      <div className="mt-5 rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
          <Sparkles size={12} /> Insights
        </div>
        {tips.length === 0 ? (
          <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            Keep tracking for a few more days and Veylo will start finding patterns.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {tips.map((t) => (
              <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
