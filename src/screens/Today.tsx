import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { Bell, MoreVertical, Plus, Sparkles, UserRound } from 'lucide-react';
import type { Habit, Screen } from '../lib/types';
import { useHabo } from '../lib/store';
import { fmtTime, greeting, key, niceDate } from '../lib/dates';
import { adaptiveAdvice, activeHabits, currentStreak, isScheduledOn } from '../lib/stats';
import { Bar, Checkbox, EmptyState, HIcon, IconBadge, PrimaryBtn, useToast } from '../components/ui';
import { HabitActionsSheet, HabitDetailSheet, HabitFormSheet } from '../components/sheets';

type SheetState = { kind: 'add' | 'edit' | 'detail' | 'actions'; habit?: Habit } | null;

function usePress(onTap: () => void, onLongPress: () => void, delay = 460) {
  const timer = useRef<number | undefined>(undefined);
  const pos = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => {
    window.clearTimeout(timer.current);
    pos.current = null;
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      pos.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, delay);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (pos.current && Math.hypot(e.clientX - pos.current.x, e.clientY - pos.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: (e: React.MouseEvent) => {
      if (fired.current) {
        fired.current = false;
        e.preventDefault();
        return;
      }
      onTap();
    },
  };
}

function HabitRow({
  habit, checked, streak, onToggle, onOpen, onMenu,
}: {
  habit: Habit; checked: boolean; streak: number;
  onToggle: () => void; onOpen: () => void; onMenu: () => void;
}) {
  const controls = useDragControls();
  const press = usePress(onOpen, onMenu);
  const today = key(new Date());

  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${habit.name} details`}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
        {...press}
        className="flex cursor-pointer items-center gap-3 rounded-[16px] px-2.5 py-2.5 transition-colors active:bg-[var(--surface-2)]"
      >
        <Checkbox checked={checked} onToggle={onToggle} label={checked ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`} />
        <button
          type="button"
          aria-label={`Drag to reorder ${habit.name}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            controls.start(e);
          }}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <IconBadge name={habit.icon} done={checked} />
        </button>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[15px] font-medium transition-colors duration-300"
            style={{ color: checked ? 'var(--faint)' : 'var(--text)' }}
          >
            {habit.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--faint)' }}>
            <span>{streak > 0 ? `${streak} day streak` : 'Start a streak today'}</span>
            {habit.goalValue && <span>· {habit.goalValue} {habit.goalUnit === 'minutes' ? 'min' : habit.goalUnit}</span>}
          </div>
        </div>
        {habit.time && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium tabular-nums"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          >
            {fmtTime(habit.time)}
          </span>
        )}
        <button
          type="button"
          aria-label={`More options for ${habit.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors active:bg-[var(--surface-2)]"
          style={{ color: 'var(--faint)' }}
        >
          <MoreVertical size={17} />
        </button>
      </div>
      <span className="sr-only">{checked ? `${habit.name} completed on ${today}` : `${habit.name} not completed`}</span>
    </Reorder.Item>
  );
}

export default function Today({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [bellOpen, setBellOpen] = useState(false);

  const now = new Date();
  const todayK = key(now);
  const todays = useMemo(
    () => data.habits.filter((h) => !h.archived && isScheduledOn(h, now)),
    [data.habits],
  );
  const done = todays.filter((h) => data.completions[h.id]?.[todayK] !== undefined).length;
  const pct = todays.length ? done / todays.length : 0;
  const advice = useMemo(() => adaptiveAdvice(data), [data]);
  const reminders = useMemo(
    () => todays.filter((h) => h.reminder && h.time).sort((a, b) => a.time!.localeCompare(b.time!)),
    [todays],
  );

  const copy = pct === 1 && todays.length > 0
    ? 'All done for today. Nice work.'
    : pct > 0.5
      ? "You're doing well."
      : 'Small steps add up.';

  const ids = todays.map((h) => h.id);
  const noHabits = activeHabits(data).length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {greeting(now.getHours())}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>{niceDate(now)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              aria-label="Today's reminders"
              onClick={() => setBellOpen((v) => !v)}
              className="relative grid h-10 w-10 place-items-center rounded-full transition-colors active:bg-[var(--surface-2)]"
              style={{ color: 'var(--muted)' }}
            >
              <Bell size={19} />
              {reminders.length > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-11 z-40 w-64 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-2xl"
                  >
                    <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
                      Today's reminders
                    </div>
                    {reminders.length === 0 && (
                      <p className="px-3 pb-3 pt-1 text-[13px]" style={{ color: 'var(--muted)' }}>Nothing scheduled for today.</p>
                    )}
                    {reminders.map((h) => (
                      <div key={h.id} className="flex items-center gap-2.5 rounded-[10px] px-2 py-2">
                        <HIcon name={h.icon} size={15} className="shrink-0" />
                        <span className="flex-1 truncate text-[13px]" style={{ color: 'var(--text)' }}>{h.name}</span>
                        <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--muted)' }}>{fmtTime(h.time)}</span>
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            aria-label="Open settings"
            onClick={() => onNavigate('settings')}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] transition-transform active:scale-95"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          >
            <UserRound size={17} />
          </button>
        </div>
      </div>

      {/* content */}
      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-6">
        {noHabits ? (
          <EmptyState title="Nothing planned yet" sub="Start with one small habit.">
            <PrimaryBtn onClick={() => setSheet({ kind: 'add' })}>Create Habit</PrimaryBtn>
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="flex h-12 items-center rounded-[14px] px-4 text-[14.5px] font-semibold"
              style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)', color: 'var(--text)' }}
            >
              Build a Plan
            </button>
          </EmptyState>
        ) : (
          <>
            {/* today's summary */}
            <div className="px-2">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--muted)' }}>
                    <span className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{done}</span>
                    <span className="tabular-nums"> / {todays.length} completed</span>
                  </div>
                  <div className="mt-1.5 text-[12px]" style={{ color: 'var(--faint)' }}>{copy}</div>
                </div>
                <div className="pb-0.5 text-[13px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                  {Math.round(pct * 100)}%
                </div>
              </div>
              <div className="mt-3">
                <Bar pct={pct} />
              </div>
            </div>

            {/* adaptive advice */}
            {advice && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                  <Sparkles size={13} /> A gentler step
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
                  You've been missing <b>{advice.habit.name}</b> often lately. Try{' '}
                  <b>{advice.to} {advice.habit.goalUnit}</b> instead of {advice.habit.goalValue} for the next 7 days?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'acceptAdvice', id: advice.habit.id, value: advice.to });
                      toast('Adjusted — small steps add up.');
                    }}
                    className="h-10 flex-1 rounded-[12px] text-[13px] font-semibold"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'dismissAdvice', id: advice.habit.id });
                      toast('Keeping it as is — you know best.');
                    }}
                    className="h-10 flex-1 rounded-[12px] text-[13px] font-medium"
                    style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)', color: 'var(--text)' }}
                  >
                    Keep {advice.habit.goalValue} {advice.habit.goalUnit}
                  </button>
                </div>
              </motion.div>
            )}

            {/* habit list */}
            {todays.length === 0 ? (
              <div className="mt-8 px-6 py-10 text-center">
                <p className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Nothing scheduled today</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>Enjoy the quiet — or plan something small.</p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={ids}
                onReorder={(newIds) => dispatch({ type: 'reorder', ids: newIds })}
                className="mt-4 flex flex-col gap-0.5"
              >
                <AnimatePresence initial={false}>
                  {todays.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      checked={data.completions[h.id]?.[todayK] !== undefined}
                      streak={currentStreak(h, data.completions)}
                      onToggle={() => dispatch({ type: 'toggle', habitId: h.id, date: todayK })}
                      onOpen={() => setSheet({ kind: 'detail', habit: h })}
                      onMenu={() => setSheet({ kind: 'actions', habit: h })}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}

            <button
              type="button"
              onClick={() => setSheet({ kind: 'add' })}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-dashed text-[14px] font-semibold transition-colors active:bg-[var(--surface-2)]"
              style={{ borderColor: 'var(--line-2)', color: 'var(--muted)' }}
            >
              <Plus size={16} /> Add Habit
            </button>
          </>
        )}
      </div>

      {/* sheets */}
      <AnimatePresence>
        {sheet?.kind === 'add' && <HabitFormSheet key="add" initial={null} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'edit' && sheet.habit && (
          <HabitFormSheet key="edit" initial={sheet.habit} onClose={() => setSheet(null)} />
        )}
        {sheet?.kind === 'detail' && sheet.habit && (
          <HabitDetailSheet
            key="detail"
            habitId={sheet.habit.id}
            onClose={() => setSheet(null)}
            onEdit={() => setSheet({ kind: 'edit', habit: sheet.habit })}
          />
        )}
        {sheet?.kind === 'actions' && sheet.habit && (
          <HabitActionsSheet
            key="actions"
            habitId={sheet.habit.id}
            onClose={() => setSheet(null)}
            onView={() => setSheet({ kind: 'detail', habit: sheet.habit })}
            onEdit={() => setSheet({ kind: 'edit', habit: sheet.habit })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
