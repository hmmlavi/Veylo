import type { Freq, PlanItem, PlannerProfile } from './types';

/*
 * Veylo's local planner engine.
 * Pure local rules: goal templates + time budget scaling + preferred-hour
 * scheduling. No network, no external API — it behaves like a quiet,
 * sensible coach that prefers sustainable routines.
 */

interface Tpl {
  name: string;
  icon: string;
  min: number; // base session minutes (0 = not time-bound)
  note: string;
  freq?: Freq;
  fixed?: string; // fixed "HH:MM"
  early?: boolean; // prefers the earliest slot
}

const TEMPLATES: Record<string, Tpl[]> = {
  Fitness: [
    { name: 'Workout', icon: 'dumbbell', min: 30, note: 'A simple session — keep it light at first.' },
    { name: 'Walk', icon: 'footprints', min: 20, note: 'An easy walk, outside if you can.' },
    { name: 'Drink 2L Water', icon: 'droplets', min: 0, early: true, note: 'Keep a bottle nearby through the day.' },
    { name: 'Sleep Before 11:30', icon: 'moon', min: 0, fixed: '23:30', note: 'Recovery is part of training.' },
  ],
  Study: [
    { name: 'Focus Study', icon: 'book', min: 45, note: 'One distraction-free block. Phone away.' },
    { name: 'Read 15 Pages', icon: 'book', min: 20, note: 'Anything that feeds the subject.' },
    { name: 'Review Notes', icon: 'pen', min: 10, note: 'A short recap makes it stick.', freq: 'weekdays' },
  ],
  Career: [
    { name: 'Practice Coding', icon: 'code', min: 60, note: 'Build something small or solve problems.' },
    { name: 'Learn One New Thing', icon: 'brain', min: 20, note: 'An article, a doc page, a concept.' },
    { name: 'Plan Tomorrow', icon: 'pen', min: 5, note: 'Three lines before you log off.', fixed: '21:30' },
  ],
  'Better Routine': [
    { name: 'Wake Up at 7:00', icon: 'sun', min: 0, fixed: '07:00', early: true, note: 'Same time every day, even weekends.' },
    { name: 'Make the Bed', icon: 'sun', min: 5, early: true, note: 'A two-minute win to start the day.' },
    { name: 'Evening Walk', icon: 'footprints', min: 15, note: 'Unwind and close the day.' },
    { name: 'Sleep Before 11:30', icon: 'moon', min: 0, fixed: '23:30', note: 'A calm cutoff for screens.' },
  ],
  Reading: [
    { name: 'Read 20 Pages', icon: 'book', min: 30, note: 'Fiction or non-fiction — your call.' },
    { name: 'Write One Line About It', icon: 'pen', min: 5, note: 'A single sentence is enough.' },
  ],
  'Personal Growth': [
    { name: 'Meditate', icon: 'heart', min: 10, early: true, note: 'Just sit and breathe. No app needed.' },
    { name: 'Journal', icon: 'pen', min: 5, note: 'Three honest lines before sleep.', fixed: '22:00' },
    { name: 'Learn Something New', icon: 'brain', min: 15, note: 'Curiosity counts as progress.' },
  ],
};

const BUDGET: Record<string, number> = {
  '15–30 min': 25,
  '30–60 min': 50,
  '1–2 hours': 100,
  '2–3 hours': 160,
  '3+ hours': 220,
};

const SLOTS: Record<string, string[]> = {
  Morning: ['07:00', '07:45', '08:30', '09:15'],
  Afternoon: ['13:00', '14:00', '15:30', '16:30'],
  Evening: ['18:00', '18:45', '19:30', '20:15'],
  Night: ['21:00', '21:45', '22:30', '23:00'],
  'It varies': ['08:00', '12:30', '18:00', '21:00'],
};

export interface Plan {
  title: string;
  subtitle: string;
  items: PlanItem[];
}

export function generatePlan(p: PlannerProfile): Plan {
  const lower = `${p.goal} ${p.notes}`.toLowerCase();
  let tpl = TEMPLATES[p.goal] ?? TEMPLATES['Personal Growth'];
  if (p.goal === 'Custom') {
    tpl = [...TEMPLATES['Better Routine']];
    if (/read|book/.test(lower)) tpl.push(TEMPLATES['Reading'][0]);
    if (/gym|run|workout|fit/.test(lower)) tpl.push(TEMPLATES['Fitness'][0]);
    if (/code|study|learn/.test(lower)) tpl.push(TEMPLATES.Study[0]);
  }

  const budget = BUDGET[p.time] ?? 50;
  const scale = budget <= 25 ? 0.6 : budget <= 50 ? 1 : budget <= 100 ? 1.6 : budget <= 160 ? 2 : 2.4;
  const maxCount = budget <= 25 ? 3 : budget <= 50 ? 4 : 5;
  const slots = SLOTS[p.productive] ?? SLOTS.Evening;

  const sorted = [...tpl].sort((a, b) => Number(b.early ?? false) - Number(a.early ?? false));
  const items: PlanItem[] = [];
  let usedMinutes = 0;
  let slotIdx = 0;

  for (const t of sorted) {
    if (items.length >= maxCount) break;
    const mins = t.min > 0 ? Math.max(10, Math.round((t.min * scale) / 5) * 5) : 0;
    if (usedMinutes + mins > budget && mins > 0 && items.length > 0) continue;
    let time: string | null = null;
    if (t.fixed) time = t.fixed;
    else if (t.early) time = slots[0];
    else {
      slotIdx = Math.max(slotIdx, t.early === false ? 1 : 0);
      time = slots[Math.min(slotIdx, slots.length - 1)];
      slotIdx++;
    }
    usedMinutes += mins;
    items.push({
      name: t.name,
      icon: t.icon,
      duration: mins > 0 ? `${mins} min/day` : t.name.includes('Sleep') ? 'Before 11:30 PM' : 'Through the day',
      time,
      freq: t.freq ?? 'daily',
      goalValue: mins > 0 ? mins : null,
      goalUnit: mins > 0 ? 'minutes' : null,
      note: t.note,
    });
  }

  return {
    title: p.goal === 'Custom' ? 'Your plan' : `${p.goal} plan`,
    subtitle: `Built around your ${p.time.toLowerCase()} · ${p.productive.toLowerCase()} focus`,
    items,
  };
}
