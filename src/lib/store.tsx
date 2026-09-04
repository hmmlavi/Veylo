import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Completions, Freq, HaboData, Habit, PlannerProfile, Settings } from './types';
import { daysAgo, key, todayKey } from './dates';
import { generatePlan } from './planner';

const LS_KEY = 'veylo-data-v1';
const LEGACY_LS_KEY = 'hobo-data-v1';

export function uid(): string {
  return `h_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'midnight',
  mode: 'dark',
  weekStart: 1,
  reminders: true,
  dailySummary: false,
  plannerTips: true,
  adaptive: true,
};

/* ————— deterministic seed so first-run data always looks real ————— */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed(): HaboData {
  const c0 = key(daysAgo(70));
  const mk = (
    id: string, name: string, icon: string, time: string | null,
    goalValue: number | null, goalUnit: string | null, note: string, freq: Freq = 'daily',
  ): Habit => ({
    id, name, note, icon, freq,
    days: freq === 'weekdays' ? [1, 2, 3, 4, 5] : [],
    time, goalValue, goalUnit,
    reminder: true, createdAt: c0, archived: false, archivedAt: null,
  });

  const habits: Habit[] = [
    mk('water', 'Drink 2L Water', 'droplets', '08:15', 2, 'litres', 'Two litres spread through the day — a bottle within reach helps.'),
    mk('dsa', 'Study DSA', 'book', '19:00', 60, 'minutes', 'Daily practice of data structures and algorithms.'),
    mk('walk', 'Walk 30 min', 'footprints', '08:30', 30, 'minutes', 'An easy walk after breakfast. Fresh air counts.'),
    mk('read', 'Read 10 Pages', 'book', '22:00', 10, 'pages', 'Ten pages before bed. Fiction or non-fiction.'),
    mk('coding', 'Practice Coding', 'code', '20:00', 60, 'minutes', 'Build something small or solve a problem or two.'),
    mk('sleep', 'Sleep Before 12', 'moon', '23:30', null, null, 'Screens off a bit earlier; lights out by midnight.'),
  ];

  const base: Record<string, number> = { water: 0.8, dsa: 0.86, walk: 0.72, read: 0.62, coding: 0.88, sleep: 0.45 };
  const rand = mulberry32(20240828);
  const completions: Completions = {};
  for (const h of habits) completions[h.id] = {};

  for (let i = 70; i >= 1; i--) {
    const d = daysAgo(i);
    const k = key(d);
    const wd = d.getDay();
    for (const h of habits) {
      let p = base[h.id];
      if (h.id === 'walk' && wd === 0) p = 0.22; // walks often skipped on Sundays
      if (h.id === 'sleep' && (wd === 5 || wd === 6)) p = 0.3; // weekends drift late
      // "Read 10 Pages" has recently become hard to keep — the planner will notice
      if (h.id === 'read') {
        if (i <= 6) continue; // a run of missed days
        if (i <= 10) p = 0.25;
      }
      if (rand() < p) {
        const hBase = h.time ? Number(h.time.split(':')[0]) : 9;
        const hour = Math.min(23, Math.max(5, Math.round(hBase + (rand() * 3 - 1.2))));
        completions[h.id][k] = hour;
      }
    }
  }
  // make sure yesterday + today streaks feel alive for the demo
  const recent: Record<string, number[]> = {
    water: [1, 2, 3], dsa: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    walk: [1, 2, 3, 4, 5, 6], coding: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    sleep: [1],
  };
  for (const [id, days] of Object.entries(recent)) {
    const h = habits.find((x) => x.id === id)!;
    for (const i of days) completions[id][key(daysAgo(i))] = h.time ? Number(h.time.split(':')[0]) : 20;
  }

  return { habits, completions, settings: { ...DEFAULT_SETTINGS }, planner: null, dismissed: {} };
}

function blank(): HaboData {
  return { habits: [], completions: {}, settings: { ...DEFAULT_SETTINGS }, planner: null, dismissed: {} };
}

function load(): HaboData {
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return seed();
    const p = JSON.parse(raw) as HaboData;
    return {
      habits: (p.habits ?? []).map((h) => ({ ...h, archivedAt: h.archivedAt ?? null, days: h.days ?? [] })),
      completions: p.completions ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
      planner: p.planner ?? null,
      dismissed: p.dismissed ?? {},
    };
  } catch {
    return seed();
  }
}

/* ————— reducer ————— */

export type Action =
  | { type: 'toggle'; habitId: string; date: string }
  | { type: 'add'; habit: Habit }
  | { type: 'update'; habit: Habit }
  | { type: 'remove'; id: string }
  | { type: 'archive'; id: string; archived: boolean }
  | { type: 'reorder'; ids: string[] }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'planner'; profile: PlannerProfile | null }
  | { type: 'applyPlan' }
  | { type: 'acceptAdvice'; id: string; value: number }
  | { type: 'dismissAdvice'; id: string }
  | { type: 'reset' };

function reducer(state: HaboData, a: Action): HaboData {
  switch (a.type) {
    case 'toggle': {
      const c: Completions = { ...state.completions };
      const rec = { ...(c[a.habitId] ?? {}) };
      if (rec[a.date] !== undefined) delete rec[a.date];
      else rec[a.date] = new Date().getHours();
      c[a.habitId] = rec;
      return { ...state, completions: c };
    }
    case 'add':
      return { ...state, habits: [...state.habits, a.habit] };
    case 'update':
      return { ...state, habits: state.habits.map((h) => (h.id === a.habit.id ? a.habit : h)) };
    case 'remove': {
      const c: Completions = { ...state.completions };
      delete c[a.id];
      return { ...state, habits: state.habits.filter((h) => h.id !== a.id), completions: c };
    }
    case 'archive':
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === a.id ? { ...h, archived: a.archived, archivedAt: a.archived ? todayKey() : null } : h,
        ),
      };
    case 'reorder': {
      const byId = new Map(state.habits.map((h) => [h.id, h]));
      const ordered = a.ids.map((id) => byId.get(id)).filter((h): h is Habit => !!h);
      const rest = state.habits.filter((h) => !a.ids.includes(h.id));
      return { ...state, habits: [...ordered, ...rest] };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'planner':
      return { ...state, planner: a.profile };
    case 'applyPlan': {
      if (!state.planner) return state;
      const plan = generatePlan(state.planner);
      const names = new Set(state.habits.map((h) => h.name.toLowerCase()));
      const fresh: Habit[] = plan.items
        .filter((it) => !names.has(it.name.toLowerCase()))
        .map((it) => ({
          id: uid(), name: it.name, note: it.note, icon: it.icon, freq: it.freq,
          days: it.freq === 'weekdays' ? [1, 2, 3, 4, 5] : [],
          time: it.time, goalValue: it.goalValue, goalUnit: it.goalUnit,
          reminder: state.settings.reminders, createdAt: todayKey(), archived: false, archivedAt: null,
        }));
      return {
        ...state,
        habits: [...state.habits, ...fresh],
        planner: { ...state.planner, appliedAt: todayKey() },
      };
    }
    case 'acceptAdvice':
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === a.id ? { ...h, goalValue: a.value } : h)),
        dismissed: { ...state.dismissed, [a.id]: true },
      };
    case 'dismissAdvice':
      return { ...state, dismissed: { ...state.dismissed, [a.id]: true } };
    case 'reset':
      return { ...blank(), settings: state.settings };
    default:
      return state;
  }
}

/* ————— context ————— */

const Ctx = createContext<{ data: HaboData; dispatch: React.Dispatch<Action> } | null>(null);

export function HaboProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      /* storage full/blocked — app still works in-session */
    }
  }, [data]);

  const value = useMemo(() => ({ data, dispatch }), [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHabo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHabo outside provider');
  return ctx;
}
