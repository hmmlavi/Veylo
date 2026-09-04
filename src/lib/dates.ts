/** Local date-key helpers — everything runs on the device clock, fully offline. */

export function key(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return key(new Date());
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function daysAgo(n: number): Date {
  return addDays(new Date(), -n);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function monthTitle(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function niceDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function shortWeekday(i: number): string {
  return WEEKDAYS[i];
}

export function orderedWeekdays(weekStart: 0 | 1): number[] {
  const base = [0, 1, 2, 3, 4, 5, 6];
  return weekStart === 1 ? [...base.slice(1), 0] : base;
}

export function weekdayLetter(i: number): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i];
}

/** "19:00" -> "7:00 PM" */
export function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${`${m}`.padStart(2, '0')} ${ampm}`;
}

/** Convert 12h input parts -> "HH:MM" 24h */
export function to24(h12: number, min: number, pm: boolean): string {
  let h = h12 % 12;
  if (pm) h += 12;
  return `${`${h}`.padStart(2, '0')}:${`${min}`.padStart(2, '0')}`;
}

export function from24(t: string): { h12: number; min: number; pm: boolean } {
  const [h, m] = t.split(':').map(Number);
  return { h12: h % 12 === 0 ? 12 : h % 12, min: m, pm: h >= 12 };
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Winding down';
}

/** bucket scheduled hour into a routine part of day */
export function dayPart(time: string | null): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  if (!time) return 'Morning';
  const h = Number(time.split(':')[0]);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}
