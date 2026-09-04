import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, BatteryMedium, CalendarDays, Signal, Sparkles, Sun, Settings as SettingsIcon, Wifi,
} from 'lucide-react';
import type { Screen } from './lib/types';
import { HaboProvider, useHabo } from './lib/store';
import { Logo, ToastProvider } from './components/ui';
import Today from './screens/Today';
import Calendar from './screens/Calendar';
import Progress from './screens/Progress';
import Planner from './screens/Planner';
import Settings from './screens/Settings';

/* ————— android status bar ————— */

function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 20000);
    return () => window.clearInterval(t);
  }, []);
  const hh = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12;
  const mm = `${now.getMinutes()}`.padStart(2, '0');
  return (
    <div className="th flex h-8 shrink-0 items-center justify-between px-6 pt-1" style={{ color: 'var(--text)' }}>
      <span className="text-[12px] font-semibold tabular-nums tracking-wide">{hh}:{mm}</span>
      <span className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
        <Signal size={12} />
        <Wifi size={12} />
        <BatteryMedium size={15} />
      </span>
    </div>
  );
}

/* ————— bottom navigation ————— */

const TABS: { id: Screen; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'planner', label: 'Planner', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  return (
    <nav className="th shrink-0 border-t border-[var(--line)]" style={{ background: 'var(--bg)' }} aria-label="Main navigation">
      <div className="flex items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
            >
              <span className="relative grid h-7 w-16 place-items-center">
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  size={19}
                  strokeWidth={active ? 2.3 : 2}
                  className="relative transition-colors duration-200"
                  style={{ color: active ? 'var(--accent)' : 'var(--faint)' }}
                />
              </span>
              <span
                className="text-[10px] font-medium transition-colors duration-200"
                style={{ color: active ? 'var(--accent)' : 'var(--faint)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid place-items-center pb-1.5">
        <span className="h-1 w-28 rounded-full" style={{ background: 'var(--line-2)' }} />
      </div>
    </nav>
  );
}

/* ————— splash ————— */

function Splash() {
  return (
    <motion.div
      className="absolute inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ background: '#0C1220' }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <Logo size={84} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="mt-5 text-[22px] font-bold tracking-[0.42em]"
        style={{ color: '#F1EDE2', marginRight: '-0.42em' }}
      >
        Veylo
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.34 }}
        className="mt-2 text-[11.5px] tracking-wide"
        style={{ color: '#70798C' }}
      >
        small actions, better days
      </motion.div>
    </motion.div>
  );
}

/* ————— shell ————— */

function Shell() {
  const { data } = useHabo();
  const [screen, setScreen] = useState<Screen>('today');
  const [splash, setSplash] = useState(true);
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSplash(false), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const s = data.settings;
  const dark = s.mode === 'system' ? sysDark : s.mode === 'dark';

  return (
    <div
      className="no-select relative flex h-[100dvh] w-full flex-col overflow-y-auto sm:h-[min(880px,94dvh)] sm:w-[400px] sm:overflow-hidden sm:rounded-[46px] sm:border-[5px] sm:border-[#04060B] sm:shadow-[0_50px_140px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)]"
      data-th={s.theme}
      data-mode={dark ? 'dark' : 'light'}
      style={{ background: 'var(--bg)', transition: 'background-color .3s ease' }}
    >
      <ToastProvider>
        <StatusBar />
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {screen === 'today' && <Today onNavigate={setScreen} />}
              {screen === 'calendar' && <Calendar />}
              {screen === 'progress' && <Progress />}
              {screen === 'planner' && <Planner />}
              {screen === 'settings' && <Settings onNavigate={setScreen} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <BottomNav screen={screen} go={setScreen} />
        <AnimatePresence>{splash && <Splash />}</AnimatePresence>
      </ToastProvider>
    </div>
  );
}

/* ————— ambient stage (desktop) ————— */

function Stage() {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#06080E]">
      {/* ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          background:
            'radial-gradient(600px 480px at 50% 12%, rgba(35,54,92,.5), transparent 65%),' +
            'radial-gradient(500px 420px at 82% 88%, rgba(233,221,196,.06), transparent 60%),' +
            'radial-gradient(420px 380px at 12% 82%, rgba(110,147,206,.1), transparent 60%)',
        }}
      />
      {/* faint Veylo watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
        <span className="select-none text-[26vw] font-bold tracking-tight" style={{ color: 'rgba(233,221,196,.02)' }}>
          Veylo
        </span>
      </div>

      <Shell />

      <div className="mt-7 hidden items-center gap-3 sm:flex">
        <Logo size={26} />
        <div className="text-[12.5px] leading-tight" style={{ color: '#5D6577' }}>
          <span className="font-semibold tracking-[0.16em]" style={{ color: '#8B94A7' }}>Veylo</span>
          {'  ·  '}small actions, better days
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HaboProvider>
      <Stage />
    </HaboProvider>
  );
}
