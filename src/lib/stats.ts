import type { Completions, Habit, HaboData } from './types';
import { addDays, dayPart, key, parseKey, shortWeekday } from './dates';

/* ————— scheduling ————— */

export function isScheduledOn(h: Habit, d: Date): boolean {
  const k = key(d);
  if (h.createdAt > k) return false;
  if (h.archivedAt && k > h.archivedAt) return false;
  if (h.freq === 'daily') return true;
  const w = d.getDay();
  if (h.freq === 'weekdays') return w >= 1 && w <= 5;
  return h.days.includes(w);
}

export function doneOn(h: Habit, c: Completions, k: string): boolean {
  return c[h.id]?.[k] !== undefined;
}

export function activeHabits(data: HaboData): Habit[] {
  return data.habits.filter((h) => !h.archived);
}

/** habits scheduled on a given date, sorted by time then name */
export function habitsForDate(data: HaboData, d: Date): Habit[] {
  return data.habits
    .filter((h) => isScheduledOn(h, d))
    .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99') || a.name.localeCompare(b.name));
}

export function dayStats(data: HaboData, d: Date): { done: number; total: number } {
  const k = key(d);
  const hs = habitsForDate(data, d);
  return { total: hs.length, done: hs.filter((h) => doneOn(h, data.completions, k)).length };
}

/** 0..5 intensity used by the consistency calendar */
export function levelFor(done: number, total: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (total === 0 || done === 0) return 0;
  const r = done / total;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  if (r < 1) return 4;
  return 5;
}

/* ————— streaks ————— */

export function currentStreak(h: Habit, c: Completions): number {
  const done = c[h.id] ?? {};
  let d = new Date();
  if (done[key(d)] === undefined) d = addDays(d, -1); // streak survives until today ends
  let streak = 0;
  for (let i = 0; i < 500; i++) {
    if (key(d) < h.createdAt) break;
    if (isScheduledOn(h, d)) {
      if (done[key(d)] !== undefined) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function longestStreak(h: Habit, c: Completions): number {
  const done = c[h.id] ?? {};
  const today = key(new Date());
  let d = parseKey(h.createdAt);
  let run = 0;
  let best = 0;
  for (let i = 0; i < 4000 && key(d) <= today; i++) {
    if (isScheduledOn(h, d)) {
      if (done[key(d)] !== undefined) {
        run++;
        if (run > best) best = run;
      } else run = 0;
    }
    d = addDays(d, 1);
  }
  return best;
}

export function bestStreakOverall(data: HaboData): number {
  return data.habits.reduce((m, h) => Math.max(m, longestStreak(h, data.completions)), 0);
}

/* ————— periods ————— */

export interface PeriodStat {
  done: number;
  total: number;
  rate: number; // 0..1
  prevRate: number; // 0..1
  delta: number; // rate - prevRate
}

export function periodStat(data: HaboData, days: number): PeriodStat {
  const span = (offset: number) => {
    let done = 0;
    let total = 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(new Date(), -(i + offset));
      const s = dayStats(data, d);
      done += s.done;
      total += s.total;
    }
    return { done, total };
  };
  const cur = span(0);
  const prev = span(days);
  const rate = cur.total ? cur.done / cur.total : 0;
  const prevRate = prev.total ? prev.done / prev.total : 0;
  return { done: cur.done, total: cur.total, rate, prevRate, delta: rate - prevRate };
}

/** current calendar week (weekStart..today) */
export function thisWeek(data: HaboData, weekStart: 0 | 1): { done: number; total: number; rate: number } {
  const now = new Date();
  const offset = (now.getDay() - weekStart + 7) % 7;
  let done = 0;
  let total = 0;
  for (let i = offset; i >= 0; i--) {
    const s = dayStats(data, addDays(now, -i));
    done += s.done;
    total += s.total;
  }
  return { done, total, rate: total ? done / total : 0 };
}

/** current calendar month to date */
export function thisMonth(data: HaboData): number {
  const now = new Date();
  let done = 0;
  let total = 0;
  for (let day = 1; day <= now.getDate(); day++) {
    const s = dayStats(data, new Date(now.getFullYear(), now.getMonth(), day));
    done += s.done;
    total += s.total;
  }
  return total ? done / total : 0;
}

export interface Bucket {
  from: Date;
  to: Date;
  rate: number;
}

/** split the last `days` days into n contiguous buckets with a completion rate each */
export function buckets(data: HaboData, days: number, n: number): Bucket[] {
  const per = Math.floor(days / n);
  const out: Bucket[] = [];
  for (let b = n - 1; b >= 0; b--) {
    let done = 0;
    let total = 0;
    const from = addDays(new Date(), -((b + 1) * per - 1));
    const to = addDays(new Date(), -(b * per));
    for (let i = b * per; i < (b + 1) * per; i++) {
      const s = dayStats(data, addDays(new Date(), -i));
      done += s.done;
      total += s.total;
    }
    out.push({ from, to, rate: total ? done / total : 0 });
  }
  return out;
}

/* ————— insights (local, rule-based) ————— */

export function insights(data: HaboData): string[] {
  const active = activeHabits(data);
  if (active.length === 0) return [];
  const earliest = active.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), active[0].createdAt);
  const trackedDays = Math.floor((Date.now() - parseKey(earliest).getTime()) / 86400000);
  if (trackedDays < 7) return [];

  const out: string[] = [];

  // most consistent habit
  let bestH: Habit | null = null;
  let bestR = 0;
  for (const h of active) {
    let d = 0;
    let t = 0;
    for (let i = 0; i < 28; i++) {
      const day = addDays(new Date(), -i);
      if (isScheduledOn(h, day)) {
        t++;
        if (doneOn(h, data.completions, key(day))) d++;
      }
    }
    const r = t ? d / t : 0;
    if (r > bestR) {
      bestR = r;
      bestH = h;
    }
  }
  if (bestH && bestR >= 0.75) {
    out.push(`You're most consistent with ${bestH.name.toLowerCase()} in the ${dayPart(bestH.time).toLowerCase()}.`);
  }

  // weakest weekday per habit
  for (const h of active) {
    const perDay: number[][] = [[], [], [], [], [], [], []];
    for (let i = 1; i <= 56; i++) {
      const day = addDays(new Date(), -i);
      if (isScheduledOn(h, day)) perDay[day.getDay()].push(doneOn(h, data.completions, key(day)) ? 1 : 0);
    }
    for (let w = 0; w < 7; w++) {
      const arr = perDay[w];
      if (arr.length >= 3) {
        const r = arr.reduce((a, b) => a + b, 0) / arr.length;
        const all = perDay.flat();
        const overall = all.reduce((a, b) => a + b, 0) / all.length;
        if (r <= 0.35 && overall - r >= 0.3) {
          out.push(`You usually miss ${h.name.toLowerCase()} on ${shortWeekday(w)}s.`);
          break;
        }
      }
    }
    if (out.length >= 3) break;
  }

  // best completion window (3h sliding) from recorded completion hours
  const hours = new Array(24).fill(0) as number[];
  for (const hId of Object.keys(data.completions)) {
    for (const hr of Object.values(data.completions[hId])) hours[Math.min(23, Math.max(0, Math.round(hr)))]++;
  }
  let bestWin = 0;
  let bestSum = -1;
  for (let s = 5; s <= 21; s++) {
    const sum = hours[s] + hours[s + 1] + hours[s + 2];
    if (sum > bestSum) {
      bestSum = sum;
      bestWin = s;
    }
  }
  if (bestSum >= 8) {
    const f = (h: number) => {
      const ampm = h % 24 >= 12 ? 'PM' : 'AM';
      const hh = h % 12 === 0 ? 12 : h % 12;
      return `${hh} ${ampm}`;
    };
    out.push(`Your best completion time is between ${f(bestWin)}–${f(bestWin + 3)}.`);
  }

  return out.slice(0, 3);
}

/* ————— adaptive advice ————— */

export interface Advice {
  habit: Habit;
  to: number;
  missing: number;
}

function niceReduce(v: number): number {
  const r = Math.round((v * 0.55) / 5) * 5;
  return Math.max(10, Math.min(v - 5, r));
}

/** finds one habit that's repeatedly missed and suggests a gentler target */
export function adaptiveAdvice(data: HaboData): Advice | null {
  if (!data.settings.adaptive) return null;
  for (const h of activeHabits(data)) {
    if (!h.goalValue || data.dismissed[h.id]) continue;
    const target =
      h.goalUnit === 'minutes' ? niceReduce(h.goalValue) : Math.max(3, Math.round(h.goalValue * 0.5));
    if (target >= h.goalValue) continue;
    let missed = 0;
    let sched = 0;
    let consecutive = 0;
    for (let i = 1; i <= 14; i++) {
      const day = addDays(new Date(), -i);
      if (!isScheduledOn(h, day)) continue;
      sched++;
      if (!doneOn(h, data.completions, key(day))) {
        missed++;
        if (i <= 4) consecutive++;
      }
    }
    if (sched >= 8 && missed / sched >= 0.55 && consecutive >= 2) {
      return { habit: h, to: target, missing: missed };
    }
  }
  return null;
}
