export type Freq = 'daily' | 'weekdays' | 'custom';

export interface Habit {
  id: string;
  name: string;
  note: string;
  icon: string;
  freq: Freq;
  days: number[]; // custom freq weekdays (0 = Sunday)
  time: string | null; // "HH:MM"
  goalValue: number | null;
  goalUnit: string | null;
  reminder: boolean;
  createdAt: string; // date key
  archived: boolean;
  archivedAt: string | null; // date key when archived
}

/** habitId -> dateKey("YYYY-MM-DD") -> hour of completion */
export type Completions = Record<string, Record<string, number>>;

export type ThemeId = 'midnight' | 'cream' | 'slate' | 'forest' | 'lavender';
export type Mode = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemeId;
  mode: Mode;
  weekStart: 0 | 1;
  reminders: boolean;
  dailySummary: boolean;
  plannerTips: boolean;
  adaptive: boolean;
}

export interface PlannerProfile {
  goal: string;
  time: string;
  productive: string;
  notes: string;
  appliedAt: string | null;
}

export interface PlanItem {
  name: string;
  icon: string;
  duration: string;
  time: string | null;
  freq: Freq;
  goalValue: number | null;
  goalUnit: string | null;
  note: string;
}

export interface HaboData {
  habits: Habit[];
  completions: Completions;
  settings: Settings;
  planner: PlannerProfile | null;
  /** habitId -> advice dismissed/accepted */
  dismissed: Record<string, boolean>;
}

export type Screen = 'today' | 'calendar' | 'progress' | 'planner' | 'settings';
