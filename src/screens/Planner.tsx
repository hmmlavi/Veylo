import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { PlannerProfile } from '../lib/types';
import { useHabo } from '../lib/store';
import { dayPart, fmtTime, niceDate, parseKey } from '../lib/dates';
import { adaptiveAdvice, activeHabits } from '../lib/stats';
import { generatePlan } from '../lib/planner';
import { ChipRow, FieldLabel, HIcon, PrimaryBtn, useToast } from '../components/ui';

const GOALS = ['Fitness', 'Study', 'Career', 'Better Routine', 'Reading', 'Personal Growth', 'Custom'] as const;
const TIMES = ['15–30 min', '30–60 min', '1–2 hours', '2–3 hours', '3+ hours'] as const;
const HOURS = ['Morning', 'Afternoon', 'Evening', 'Night', 'It varies'] as const;
const PART_ORDER = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

export default function Planner() {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const p = data.planner;

  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState<string>(p?.goal ?? 'Fitness');
  const [time, setTime] = useState<string>(p?.time ?? '30–60 min');
  const [productive, setProductive] = useState<string>(p?.productive ?? 'Evening');
  const [notes, setNotes] = useState(p?.notes ?? '');

  const plan = useMemo(() => (p ? generatePlan(p) : null), [p]);
  const advice = useMemo(() => adaptiveAdvice(data), [data]);
  const habits = activeHabits(data);

  const submit = () => {
    const profile: PlannerProfile = { goal, time, productive, notes, appliedAt: null };
    dispatch({ type: 'planner', profile });
    setEditing(false);
  };

  const startSetup = () => {
    if (p) {
      setGoal(p.goal);
      setTime(p.time);
      setProductive(p.productive);
      setNotes(p.notes);
    }
    setEditing(true);
  };

  /* ————— setup form ————— */
  if (!p || editing) {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-5 pb-8 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
            <Sparkles size={15} />
          </span>
          <div>
            <h1 className="text-[24px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text)' }}>Planner</h1>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          Answer three quick questions and Veylo will draft a routine that fits your day, right on this device.
        </p>

        <FieldLabel>What's your main goal?</FieldLabel>
        <ChipRow options={GOALS} value={goal as (typeof GOALS)[number]} onChange={setGoal} />

        <FieldLabel>How much time can you realistically give each day?</FieldLabel>
        <ChipRow options={TIMES} value={time as (typeof TIMES)[number]} onChange={setTime} />

        <FieldLabel>When are you usually most productive?</FieldLabel>
        <ChipRow options={HOURS} value={productive as (typeof HOURS)[number]} onChange={setProductive} />

        <FieldLabel>Anything else? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. I'm a beginner and evenings are busy…"
          className="allow-select w-full resize-none rounded-[14px] border border-[var(--line-2)] bg-[var(--surface-2)] p-4 text-[14px] outline-none placeholder:text-[var(--faint)]"
          style={{ color: 'var(--text)' }}
        />

        <div className="mt-7">
          <PrimaryBtn onClick={submit}>Create My Plan</PrimaryBtn>
        </div>
        <p className="mt-3 text-center text-[11.5px]" style={{ color: 'var(--faint)' }}>
          Runs fully offline — nothing leaves your phone.
        </p>
      </div>
    );
  }

  /* ————— preview / applied ————— */
  const applied = !!p.appliedAt;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-8 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>{plan!.title}</h1>
        {applied && (
          <button
            type="button"
            onClick={startSetup}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)', color: 'var(--text)' }}
          >
            <RotateCcw size={12} /> New plan
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>{plan!.subtitle}</p>
      {applied && (
        <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--faint)' }}>
          Applied {niceDate(parseKey(p.appliedAt!))} — these habits now live on your Today screen.
        </p>
      )}

      {/* plan items */}
      <div className="mt-5 flex flex-col gap-2">
        {plan!.items.map((it, i) => (
          <motion.div
            key={it.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3.5 rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
              <HIcon name={it.icon} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{it.name}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
                {it.duration}{it.time ? ` · ${fmtTime(it.time)}` : ''}
              </div>
            </div>
            {applied && habits.some((h) => h.name.toLowerCase() === it.name.toLowerCase()) && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--good) 18%, transparent)', color: 'var(--good)' }}>
                Active
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {!applied ? (
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryBtn onClick={() => {
            dispatch({ type: 'applyPlan' });
            toast('Plan applied — see it on Today.');
          }}>
            Apply Plan
          </PrimaryBtn>
          <PrimaryBtn ghost onClick={startSetup}>Edit Plan</PrimaryBtn>
        </div>
      ) : (
        <>
          {/* adaptive nudge */}
          {data.settings.plannerTips && advice && (
            <div className="mt-6 rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
                <Sparkles size={12} /> Planner suggestion
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
                {advice.habit.name} has been hard to keep at {advice.habit.goalValue} {advice.habit.goalUnit}.
                This goal might be too demanding right now — try {advice.to} {advice.habit.goalUnit} for the next 7 days?
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'acceptAdvice', id: advice.habit.id, value: advice.to });
                    toast('Adjusted — let\'s make tomorrow easier.');
                  }}
                  className="h-10 flex-1 rounded-[12px] text-[13px] font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'dismissAdvice', id: advice.habit.id })}
                  className="h-10 flex-1 rounded-[12px] text-[13px] font-medium"
                  style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)', color: 'var(--text)' }}
                >
                  Keep {advice.habit.goalValue} {advice.habit.goalUnit}
                </button>
              </div>
            </div>
          )}

          {/* daily timeline */}
          {habits.some((h) => h.time) && (
            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
                Your daily plan
              </div>
              <div className="mt-3 flex flex-col gap-4">
                {PART_ORDER.map((part) => {
                  const list = habits
                    .filter((h) => h.time && dayPart(h.time) === part)
                    .sort((a, b) => a.time!.localeCompare(b.time!));
                  if (list.length === 0) return null;
                  return (
                    <div key={part}>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>{part}</div>
                      <div className="mt-1.5 flex flex-col">
                        {list.map((h, idx) => (
                          <div key={h.id} className="relative flex items-center gap-3 py-2 pl-1">
                            {idx < list.length - 1 && (
                              <span className="absolute bottom-0 left-[19px] top-8 w-px" style={{ background: 'var(--line-2)' }} />
                            )}
                            <span className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }}>
                              <span className="h-[5px] w-[5px] rounded-full" style={{ background: 'var(--accent)' }} />
                            </span>
                            <span className="w-[64px] shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: 'var(--muted)' }}>
                              {fmtTime(h.time)}
                            </span>
                            <span className="truncate text-[13.5px]" style={{ color: 'var(--text)' }}>{h.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
