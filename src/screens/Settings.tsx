import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronRight, Download, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Mode, Screen, ThemeId } from '../lib/types';
import { useHabo } from '../lib/store';
import { Logo, Toggle, useToast } from '../components/ui';

interface Palette { bg: string; card: string; accent: string }

const PREVIEWS: Record<ThemeId, { name: string; note: string; light: Palette; dark: Palette }> = {
  midnight: {
    name: 'Midnight', note: 'Deep navy · warm cream',
    light: { bg: '#F4EFE5', card: '#FFFFFF', accent: '#24406E' },
    dark: { bg: '#0C1220', card: '#131B2C', accent: '#E9DDC4' },
  },
  cream: {
    name: 'Cream', note: 'Warm cream · dark navy',
    light: { bg: '#F7F2E7', card: '#FFFDF8', accent: '#2A4670' },
    dark: { bg: '#151B2A', card: '#1D2740', accent: '#EADFC6' },
  },
  slate: {
    name: 'Slate', note: 'Soft slate · off-white',
    light: { bg: '#EDF0F3', card: '#FFFFFF', accent: '#33526E' },
    dark: { bg: '#12171D', card: '#1A222A', accent: '#C9D8E6' },
  },
  forest: {
    name: 'Forest', note: 'Muted green · soft sage',
    light: { bg: '#EFF1EA', card: '#FBFBF6', accent: '#31573F' },
    dark: { bg: '#101A13', card: '#18241B', accent: '#DDE5CC' },
  },
  lavender: {
    name: 'Lavender', note: 'Muted lavender · soft purple',
    light: { bg: '#F1EFF6', card: '#FCFBFE', accent: '#4A3F6E' },
    dark: { bg: '#16141F', card: '#1E1B2B', accent: '#DAD2F2' },
  },
};

const THEME_ORDER: ThemeId[] = ['midnight', 'cream', 'slate', 'forest', 'lavender'];
const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
        {title}
      </div>
      <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)]">{children}</div>
    </div>
  );
}

function Row({ label, sub, right, onClick, danger }: {
  label: string; sub?: string; right?: ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick && right === undefined}
      className="flex w-full items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 text-left transition-colors last:border-b-0 active:bg-[var(--surface-2)] disabled:cursor-default"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-medium" style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}>{label}</div>
        {sub && <div className="mt-0.5 text-[12px]" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
      {right}
    </button>
  );
}

function ThemePreview({ id, selected, onPick }: { id: ThemeId; selected: boolean; onPick: () => void }) {
  const t = PREVIEWS[id];
  return (
    <button type="button" onClick={onPick} className="text-left" aria-label={`${t.name} theme`}>
      <div
        className="relative flex h-[74px] overflow-hidden rounded-[14px] transition-transform active:scale-[0.97]"
        style={{ boxShadow: selected ? '0 0 0 2px var(--accent)' : '0 0 0 1px var(--line-2)' }}
      >
        {[t.light, t.dark].map((pal, i) => (
          <div key={i} className="flex-1 p-2" style={{ background: pal.bg }}>
            <div className="h-[26px] rounded-[7px] p-1.5" style={{ background: pal.card }}>
              <div className="h-[4px] w-3/4 rounded-full" style={{ background: pal.accent, opacity: 0.9 }} />
              <div className="mt-1 h-[3px] w-1/2 rounded-full" style={{ background: pal.accent, opacity: 0.3 }} />
            </div>
            <div className="mt-1.5 h-[8px] w-8 rounded-full" style={{ background: pal.accent }} />
          </div>
        ))}
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <Check size={12} strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <div className="mt-1.5 text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{t.name}</div>
      <div className="text-[10.5px]" style={{ color: 'var(--faint)' }}>{t.note}</div>
    </button>
  );
}

export default function Settings({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { data, dispatch } = useHabo();
  const toast = useToast();
  const s = data.settings;
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veylo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup downloaded.');
    } catch {
      toast('Export failed — please try again.');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-8 pt-5">
      <h1 className="px-1 text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Settings</h1>

      <Section title="Appearance">
        <Row
          label="Theme"
          sub={`${PREVIEWS[s.theme].name} · ${s.mode === 'system' ? 'System' : s.mode === 'dark' ? 'Dark' : 'Light'}`}
          onClick={() => setAppearanceOpen((v) => !v)}
          right={
            <motion.span animate={{ rotate: appearanceOpen ? 180 : 0 }} style={{ color: 'var(--muted)' }}>
              <ChevronDown size={17} />
            </motion.span>
          }
        />
        {appearanceOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-b border-[var(--line)] last:border-b-0"
          >
            <div className="grid grid-cols-2 gap-3 p-4">
              {THEME_ORDER.map((id) => (
                <ThemePreview
                  key={id}
                  id={id}
                  selected={s.theme === id}
                  onPick={() => {
                    dispatch({ type: 'settings', patch: { theme: id } });
                    toast(`${PREVIEWS[id].name} theme applied`);
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1.5 px-4 pb-4">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => dispatch({ type: 'settings', patch: { mode: m.id } })}
                  className="h-9 flex-1 rounded-full text-[12.5px] font-semibold"
                  style={{
                    background: s.mode === m.id ? 'var(--accent)' : 'var(--surface-2)',
                    color: s.mode === m.id ? 'var(--on-accent)' : 'var(--muted)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </Section>

      <Section title="Notifications">
        <Row label="Habit reminders" sub="Nudge me at each habit's time" right={
          <Toggle on={s.reminders} label="Habit reminders" onChange={(v) => dispatch({ type: 'settings', patch: { reminders: v } })} />
        } />
        <Row label="Daily summary" sub="A short recap every evening" right={
          <Toggle on={s.dailySummary} label="Daily summary" onChange={(v) => dispatch({ type: 'settings', patch: { dailySummary: v } })} />
        } />
        <Row label="Planner suggestions" sub="Occasional gentle nudges from the planner" right={
          <Toggle on={s.plannerTips} label="Planner suggestions" onChange={(v) => dispatch({ type: 'settings', patch: { plannerTips: v } })} />
        } />
      </Section>

      <Section title="Habits">
        <Row label="Week starts on" sub="Used by the calendar and weekly stats" right={
          <div className="flex gap-1 rounded-full bg-[var(--surface-2)] p-1">
            {(['Sunday', 'Monday'] as const).map((d, i) => {
              const val = (i as 0 | 1);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'settings', patch: { weekStart: val } });
                  }}
                  className="h-7 rounded-full px-3 text-[11.5px] font-semibold"
                  style={{
                    background: s.weekStart === val ? 'var(--accent)' : 'transparent',
                    color: s.weekStart === val ? 'var(--on-accent)' : 'var(--muted)',
                  }}
                >
                  {d.slice(0, 3)}
                </button>
              );
            })}
          </div>
        } />
      </Section>

      {data.habits.some((h) => h.archived) && (
        <Section title="Archived">
          {data.habits.filter((h) => h.archived).map((h) => (
            <Row
              key={h.id}
              label={h.name}
              sub="Archived — history kept, hidden from Today"
              right={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'archive', id: h.id, archived: false });
                    toast(`"${h.name}" restored`);
                  }}
                  className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                  style={{ boxShadow: 'inset 0 0 0 1.5px var(--line-2)', color: 'var(--text)' }}
                >
                  Restore
                </button>
              }
            />
          ))}
        </Section>
      )}

      <Section title="Planner">
        <Row label="Adaptive planning" sub="Suggest gentler goals when habits slip" right={
          <Toggle on={s.adaptive} label="Adaptive planning" onChange={(v) => dispatch({ type: 'settings', patch: { adaptive: v } })} />
        } />
        <Row label="Open planner" sub="Review or rebuild your plan" onClick={() => onNavigate('planner')} right={
          <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
        } />
      </Section>

      <Section title="Data">
        <Row label="Export data" sub="Download a JSON backup of everything" onClick={exportData} right={
          <Download size={16} style={{ color: 'var(--muted)' }} />
        } />
        <Row
          label={resetArmed ? 'Tap again to erase everything' : 'Reset all data'}
          sub={resetArmed ? 'Habits, history and plans will be deleted' : 'Start fresh — this cannot be undone'}
          danger
          onClick={() => {
            if (resetArmed) {
              dispatch({ type: 'reset' });
              setResetArmed(false);
              toast('All data cleared. Fresh start.');
            } else {
              setResetArmed(true);
              window.setTimeout(() => setResetArmed(false), 4000);
            }
          }}
          right={<RotateCcw size={16} style={{ color: 'var(--danger)' }} />}
        />
      </Section>

      <Section title="About">
        <div className="flex items-center gap-3.5 px-4 py-4">
          <Logo size={40} />
          <div className="flex-1">
            <div className="text-[15px] font-bold tracking-[0.12em]" style={{ color: 'var(--text)' }}>Veylo</div>
            <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>Version 1.0.0</div>
          </div>
          <SlidersHorizontal size={15} style={{ color: 'var(--faint)' }} />
        </div>
        <p className="border-t border-[var(--line)] px-4 py-3.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          Veylo keeps everything on this device. No account, no cloud, no tracking.
          Small actions, better days.
        </p>
      </Section>
    </div>
  );
}
