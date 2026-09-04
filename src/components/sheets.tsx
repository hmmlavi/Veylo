import { useState } from 'react';
import {
  Archive, CalendarDays, Clock, Info, Minus, Pencil, Plus, Target, Trash2, BellRing,
} from 'lucide-react';
import type { Freq, Habit } from '../lib/types';
import { useHabo, uid } from '../lib/store';
import { addDays, fmtTime, key, orderedWeekdays, shortWeekday, to24 } from '../lib/dates';
import { currentStreak, doneOn, isScheduledOn } from '../lib/stats';
import {
  ChipRow, FieldLabel, HABIT_ICONS, HIcon, IconBadge, PrimaryBtn, Sheet, SheetTitle, Toggle, useToast,
} from './ui';

export function freqLabel(h: Habit, weekStart: 0 | 1): string {
  if (h.freq === 'daily') return 'Every day';
  if (h.freq === 'weekdays') return 'Weekdays';
  return orderedWeekdays(weekStart)
    .filter((d) => h.days.includes(d))
    .map((d) => shortWeekday(d).slice(0, 3))
    .join(' · ');
}

/* ————— create / edit habit ————— */

const PARTS = ['any', 'morning', 'afternoon', 'evening', 'night'] as const;
type Part = (typeof PARTS)[number];
const PART_TIME: Record<Exclude<Part, 'any'>, string> = {
  morning: '08:00', afternoon: '14:00', evening: '19:00', night: '22:00',
};
const PART_LABEL: Record<Part, string> = {
  any: 'Anytime', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
};
const UNITS = ['minutes', 'pages', 'litres', 'reps'] as const;

function partOf(time: string | null): Part {
  if (!time) return 'any';
  const h = Number(time.split(':')[0]);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export function HabitFormSheet({ initial, onClose }: { initial: Habit | null; onClose: () => void }) {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'star');
  const [freq, setFreq] = useState<Freq>(initial?.freq ?? 'daily');
  const [days, setDays] = useState<number[]>(initial?.days.length ? initial.days : [1, 3, 5]);
  const [part, setPart] = useState<Part>(partOf(initial?.time ?? null));
  const [time, setTime] = useState<string>(initial?.time ?? '19:00');
  const [goalValue, setGoalValue] = useState(initial?.goalValue ? String(initial.goalValue) : '');
  const [goalUnit, setGoalUnit] = useState<(typeof UNITS)[number]>((initial?.goalUnit as (typeof UNITS)[number]) ?? 'minutes');
  const [reminder, setReminder] = useState(initial?.reminder ?? data.settings.reminders);

  const shiftTime = (mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
    setTime(to24(Math.floor((total / 60) % 24) % 12 === 0 ? 12 : Math.floor((total / 60) % 24) % 12, total % 60, Math.floor(total / 60) >= 12));
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (freq === 'custom' && days.length === 0) return;
    const finalTime = part === 'any' ? null : time;
    const gv = goalValue.trim() ? Math.max(1, Math.round(Number(goalValue))) : null;
    const payload: Habit = {
      id: initial?.id ?? uid(),
      name: trimmed,
      note: note.trim(),
      icon,
      freq,
      days: freq === 'custom' ? [...days].sort() : freq === 'weekdays' ? [1, 2, 3, 4, 5] : [],
      time: finalTime,
      goalValue: gv,
      goalUnit: gv ? goalUnit : null,
      reminder,
      createdAt: initial?.createdAt ?? key(new Date()),
      archived: initial?.archived ?? false,
      archivedAt: initial?.archivedAt ?? null,
    };
    dispatch({ type: editing ? 'update' : 'add', habit: payload });
    toast(editing ? 'Changes saved' : `"${trimmed}" added to your day`);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <SheetTitle sub={editing ? 'Update your routine' : 'Keep it small enough to repeat every day'}>
        {editing ? 'Edit Habit' : 'New Habit'}
      </SheetTitle>

      <FieldLabel>What do you want to do?</FieldLabel>
      <input
        autoFocus={!editing}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Read 10 pages"
        maxLength={48}
        className="allow-select h-12 w-full rounded-[14px] border border-[var(--line-2)] bg-[var(--surface-2)] px-4 text-[15px] font-medium outline-none placeholder:font-normal"
        style={{ color: 'var(--text)', caretColor: 'var(--accent)' }}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        maxLength={90}
        className="allow-select mt-2 h-11 w-full rounded-[14px] border border-[var(--line)] bg-transparent px-4 text-[13.5px] outline-none"
        style={{ color: 'var(--muted)' }}
      />

      <FieldLabel>Icon</FieldLabel>
      <div className="grid grid-cols-8 gap-1.5">
        {HABIT_ICONS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={`Icon ${k}`}
            onClick={() => setIcon(k)}
            className="grid h-9 place-items-center rounded-[10px] transition-colors"
            style={{
              background: icon === k ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--surface-2)',
              color: icon === k ? 'var(--accent)' : 'var(--muted)',
              boxShadow: icon === k ? 'inset 0 0 0 1.5px var(--accent)' : 'none',
            }}
          >
            <HIcon name={k} size={16} />
          </button>
        ))}
      </div>

      <FieldLabel>Frequency</FieldLabel>
      <ChipRow<Freq>
        options={['daily', 'weekdays', 'custom'] as const}
        value={freq}
        onChange={setFreq}
        render={(f) => (f === 'daily' ? 'Every day' : f === 'weekdays' ? 'Weekdays' : 'Custom')}
      />
      {freq === 'custom' && (
        <div className="mt-3 flex gap-1.5">
          {orderedWeekdays(data.settings.weekStart).map((d) => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDays((p) => (on ? p.filter((x) => x !== d) : [...p, d]))}
                className="grid h-9 flex-1 place-items-center rounded-full text-[12.5px] font-semibold"
                style={{ background: on ? 'var(--accent)' : 'var(--surface-2)', color: on ? 'var(--on-accent)' : 'var(--muted)' }}
                aria-label={shortWeekday(d)}
              >
                {shortWeekday(d).slice(0, 1)}
              </button>
            );
          })}
        </div>
      )}

      <FieldLabel>Best time</FieldLabel>
      <ChipRow<Part>
        options={PARTS}
        value={part}
        onChange={(p) => {
          setPart(p);
          if (p !== 'any') setTime(PART_TIME[p]);
        }}
        render={(p) => PART_LABEL[p]}
      />
      {part !== 'any' && (
        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-[var(--surface-2)] px-3 py-2">
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Exact time</span>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="15 minutes earlier" onClick={() => shiftTime(-15)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              <Minus size={14} />
            </button>
            <span className="min-w-[76px] text-center text-[14px] font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
              {fmtTime(time)}
            </span>
            <button type="button" aria-label="15 minutes later" onClick={() => shiftTime(15)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <FieldLabel>Goal <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></FieldLabel>
      <div className="flex items-center gap-2">
        <input
          value={goalValue}
          onChange={(e) => setGoalValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="—"
          inputMode="numeric"
          className="allow-select h-11 w-20 rounded-[12px] border border-[var(--line-2)] bg-[var(--surface-2)] px-3 text-center text-[15px] font-semibold outline-none"
          style={{ color: 'var(--text)' }}
        />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setGoalUnit(u)}
              className="rounded-full px-3 py-2 text-[12.5px] font-medium"
              style={{ background: goalUnit === u ? 'var(--accent)' : 'var(--surface-2)', color: goalUnit === u ? 'var(--on-accent)' : 'var(--muted)' }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-[14px] bg-[var(--surface-2)] px-4 py-3">
        <div className="flex items-center gap-3">
          <BellRing size={17} style={{ color: 'var(--muted)' }} />
          <div>
            <div className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>Reminder</div>
            <div className="text-[11.5px]" style={{ color: 'var(--faint)' }}>
              {reminder && part !== 'any' ? `Daily at ${fmtTime(time)}` : 'Off'}
            </div>
          </div>
        </div>
        <Toggle on={reminder} onChange={setReminder} label="Toggle reminder" />
      </div>

      <div className="mt-6">
        <PrimaryBtn onClick={create}>{editing ? 'Save Changes' : 'Create Habit'}</PrimaryBtn>
      </div>
    </Sheet>
  );
}

/* ————— habit details ————— */

export function HabitDetailSheet({
  habitId, onClose, onEdit,
}: { habitId: string; onClose: () => void; onEdit: () => void }) {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return null;

  const streak = currentStreak(habit, data.completions);
  const last30: { k: string; scheduled: boolean; done: boolean }[] = [];
  let done30 = 0;
  let sched30 = 0;
  for (let i = 34; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const k = key(d);
    const scheduled = isScheduledOn(habit, d);
    const done = doneOn(habit, data.completions, k);
    if (scheduled && i < 30) {
      sched30++;
      if (done) done30++;
    }
    last30.push({ k, scheduled, done });
  }
  const rate30 = sched30 ? Math.round((done30 / sched30) * 100) : 0;

  const meta: [typeof Clock, string, string][] = [
    [CalendarDays, 'Frequency', freqLabel(habit, data.settings.weekStart)],
    [Clock, 'Time', habit.time ? fmtTime(habit.time)! : 'Anytime'],
    [Target, 'Goal', habit.goalValue ? `${habit.goalValue} ${habit.goalUnit} a day` : 'No set goal'],
    [BellRing, 'Reminder', habit.reminder ? 'On' : 'Off'],
  ];

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start gap-3.5">
        <IconBadge name={habit.icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-bold leading-tight" style={{ color: 'var(--text)' }}>{habit.name}</h2>
          <span
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 1.5s.9 3.15-1.35 6.3C10.2 10.35 7.5 12 7.5 15a6 6 0 0012 0c0-2.1-.98-3.9-2.25-5.55-.53 1.13-1.3 1.95-2.25 2.55.3-3.6-.6-7.95-1.5-10.5z" opacity=".9" transform="translate(-1.5 3) scale(.92)"/></svg>
            {streak} day streak
          </span>
        </div>
      </div>

      {habit.note && (
        <>
          <FieldLabel>About this habit</FieldLabel>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>{habit.note}</p>
        </>
      )}

      <div className="mt-5 divide-y divide-[var(--line)] rounded-[14px] border border-[var(--line)]">
        {meta.map(([Icon, k, v]) => (
          <div key={k} className="flex items-center gap-3 px-4 py-3">
            <Icon size={16} style={{ color: 'var(--muted)' }} />
            <span className="flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>{k}</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>Last 5 weeks</span>
        <span className="text-[12px] font-medium" style={{ color: 'var(--muted)' }}>{rate30}% over 30 days</span>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5" role="img" aria-label={`${rate30}% completed over the last 30 days`}>
        {[...last30].reverse().map(({ k, scheduled, done }) => (
          <div
            key={k}
            className="aspect-square rounded-[5px]"
            style={{
              background: done ? 'var(--fill)' : scheduled ? 'var(--surface-2)' : 'transparent',
              boxShadow: k === key(new Date()) ? '0 0 0 1.5px var(--accent)' : 'none',
              opacity: scheduled || done ? 1 : 0.35,
            }}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <PrimaryBtn onClick={() => { onEdit(); }}>Edit Habit</PrimaryBtn>
        <div className="flex gap-2">
          <PrimaryBtn ghost onClick={() => {
            dispatch({ type: 'archive', id: habit.id, archived: !habit.archived });
            toast(habit.archived ? 'Habit restored' : 'Habit archived');
            onClose();
          }}>
            {habit.archived ? 'Restore' : 'Archive'}
          </PrimaryBtn>
          <PrimaryBtn ghost danger onClick={() => {
            dispatch({ type: 'remove', id: habit.id });
            toast('Habit deleted');
            onClose();
          }}>
            Delete
          </PrimaryBtn>
        </div>
      </div>
    </Sheet>
  );
}

/* ————— long-press / overflow actions ————— */

export function HabitActionsSheet({
  habitId, onClose, onView, onEdit,
}: { habitId: string; onClose: () => void; onView: () => void; onEdit: () => void }) {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return null;

  const items = [
    { icon: Info, label: 'Habit details', fn: onView },
    { icon: Pencil, label: 'Edit habit', fn: onEdit },
    {
      icon: Archive, label: habit.archived ? 'Restore habit' : 'Archive habit',
      fn: () => { dispatch({ type: 'archive', id: habit.id, archived: !habit.archived }); toast(habit.archived ? 'Habit restored' : 'Habit archived'); onClose(); },
    },
    {
      icon: Trash2, label: 'Delete habit', danger: true,
      fn: () => { dispatch({ type: 'remove', id: habit.id }); toast('Habit deleted'); onClose(); },
    },
  ];

  return (
    <Sheet onClose={onClose}>
      <div className="mb-3 flex items-center gap-3">
        <IconBadge name={habit.icon} />
        <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{habit.name}</div>
      </div>
      <div className="flex flex-col">
        {items.map(({ icon: Icon, label, fn, danger }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            className="flex items-center gap-3.5 rounded-[12px] px-3 py-3.5 text-left text-[14.5px] font-medium transition-colors active:bg-[var(--surface-2)]"
            style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}
          >
            <Icon size={18} style={{ color: danger ? 'var(--danger)' : 'var(--muted)' }} />
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
