import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHabo } from '../lib/store';
import { daysInMonth, fmtTime, key, monthTitle, niceDate, orderedWeekdays, weekdayLetter } from '../lib/dates';
import { dayStats, doneOn, habitsForDate, levelFor, thisMonth, thisWeek } from '../lib/stats';
import { Bar, Checkbox, HIcon } from '../components/ui';

const LEGEND: { label: string; cls: string }[] = [
  { label: 'All done', cls: 'cal-5' },
  { label: 'Most done', cls: 'cal-3' },
  { label: 'Some done', cls: 'cal-2' },
  { label: 'Few done', cls: 'cal-1' },
  { label: 'Not completed', cls: 'cal-0' },
];

export default function Calendar() {
  const { data, dispatch } = useHabo();
  const today = new Date();
  const todayK = key(today);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dir, setDir] = useState(0);
  const [selected, setSelected] = useState(todayK);

  const ws = data.settings.weekStart;
  const y = view.getFullYear();
  const m = view.getMonth();
  const dim = daysInMonth(y, m);
  const firstDay = new Date(y, m, 1).getDay();
  const lead = (firstDay - ws + 7) % 7;
  const cells: { k: string; date: Date | null }[] = useMemo(() => {
    const out: { k: string; date: Date | null }[] = [];
    for (let i = 0; i < lead; i++) out.push({ k: `b${i}`, date: null });
    for (let d = 1; d <= dim; d++) out.push({ k: key(new Date(y, m, d)), date: new Date(y, m, d) });
    return out;
  }, [y, m, lead, dim]);

  const shiftMonth = (n: number) => {
    setDir(n);
    setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));
  };

  const week = thisWeek(data, ws);
  const selDate = new Date(selected + 'T12:00:00');
  const selHabits = habitsForDate(data, selDate);
  const selFuture = selected > todayK;
  const selDone = selHabits.filter((h) => doneOn(h, data.completions, selected)).length;
  const selPct = selHabits.length ? selDone / selHabits.length : 0;

  const goToday = () => {
    setDir(0);
    setView(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayK);
  };
  const inCurrentMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-5">
      {/* header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Calendar</h1>
        <button
          type="button"
          onClick={goToday}
          className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95"
          style={{
            background: inCurrentMonth && selected === todayK ? 'var(--surface-2)' : 'transparent',
            boxShadow: 'inset 0 0 0 1.5px var(--line-2)',
            color: 'var(--text)',
          }}
        >
          Today
        </button>
      </div>

      {/* month nav */}
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>{monthTitle(view)}</span>
        <div className="flex gap-1">
          {[[-1, ChevronLeft, 'Previous month'], [1, ChevronRight, 'Next month']].map(([n, Icon, label]) => {
            const I = Icon as typeof ChevronLeft;
            return (
              <button
                key={label as string}
                type="button"
                aria-label={label as string}
                onClick={() => shiftMonth(n as number)}
                className="grid h-9 w-9 place-items-center rounded-full transition-colors active:bg-[var(--surface-2)]"
                style={{ color: 'var(--muted)' }}
              >
                <I size={18} />
              </button>
            );
          })}
        </div>
      </div>

      {/* weekday header */}
      <div className="mt-2 grid grid-cols-7">
        {orderedWeekdays(ws).map((d) => (
          <div key={d} className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>
            {weekdayLetter(d)}
          </div>
        ))}
      </div>

      {/* month grid */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${y}-${m}`}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map(({ k, date }) => {
              if (!date) return <div key={k} />;
              const future = k > todayK;
              const { done: d2, total } = dayStats(data, date);
              const lvl = future ? 0 : levelFor(d2, total);
              const isSel = k === selected;
              const isToday = k === todayK;
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={`${niceDate(date)} — ${total === 0 ? 'no habits' : `${d2} of ${total} habits completed`}`}
                  onClick={() => setSelected(k)}
                  className={`cal-${lvl} relative grid aspect-square place-items-center rounded-[11px] text-[13px] font-medium transition-transform duration-100 active:scale-90`}
                  style={isSel ? { boxShadow: '0 0 0 1.5px var(--accent)' } : undefined}
                >
                  {date.getDate()}
                  {isToday && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 px-1">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`${l.cls} inline-block h-3 w-3 rounded-[4px]`} style={l.cls === 'cal-0' ? { boxShadow: 'inset 0 0 0 1px var(--line-2)' } : undefined} />
            <span className="text-[10.5px]" style={{ color: 'var(--muted)' }}>{l.label}</span>
          </span>
        ))}
      </div>

      {/* this week */}
      <div className="mt-5 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>This week</span>
          <span className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{Math.round(week.rate * 100)}%</span>
        </div>
        <div className="mt-3">
          <Bar pct={week.rate} h={6} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px]" style={{ color: 'var(--muted)' }}>
          <span>{week.done} of {week.total} habits completed</span>
          <span className="tabular-nums">This month · {Math.round(thisMonth(data) * 100)}%</span>
        </div>
      </div>

      {/* selected day */}
      <div className="mt-4 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{niceDate(selDate)}</span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            {selHabits.length ? Math.round(selPct * 100) : 0}%
          </span>
        </div>
        <div className="mt-3 flex flex-col divide-y divide-[var(--line)]">
          {selHabits.length === 0 && (
            <p className="py-3 text-[13px]" style={{ color: 'var(--muted)' }}>No habits scheduled for this day.</p>
          )}
          {selHabits.map((h) => {
            const done = doneOn(h, data.completions, selected);
            return (
              <div key={h.id} className="flex items-center gap-3 py-2.5">
                <span style={{ opacity: selFuture ? 0.45 : 1 }}>
                  <Checkbox
                    checked={done}
                    label={`${h.name} on ${selected}`}
                    onToggle={() => {
                      if (!selFuture) dispatch({ type: 'toggle', habitId: h.id, date: selected });
                    }}
                  />
                </span>
                <HIcon name={h.icon} size={15} className="shrink-0" />
                <span
                  className="flex-1 truncate text-[13.5px]"
                  style={{ color: done ? 'var(--faint)' : 'var(--text)' }}
                >
                  {h.name}
                </span>
                {h.time && (
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--faint)' }}>{fmtTime(h.time)}</span>
                )}
              </div>
            );
          })}
        </div>
        {selFuture && (
          <p className="pb-1 pt-2 text-[11.5px]" style={{ color: 'var(--faint)' }}>Coming up — you can't check these off yet.</p>
        )}
      </div>
    </div>
  );
}
