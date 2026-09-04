import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlarmClock, BookOpen, Brain, Code2, Coffee, Droplets, Dumbbell, Footprints,
  Heart, Leaf, Moon, Music, PenLine, Salad, Star, Sun,
} from 'lucide-react';

/* ————— Veylo brand logo ————— */

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[28%]"
      style={{ width: size, height: size, background: '#16253F', boxShadow: '0 6px 18px rgba(10,16,30,.35)' }}
      aria-label="Veylo logo"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none">
        <path d="M8 16.5l5.5 5.5L24 11" stroke="#E9DDC4" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24.5" cy="23.5" r="2.1" fill="#7FA3D8" />
      </svg>
    </div>
  );
}

/* ————— habit icon map ————— */

const ICONS = {
  droplets: Droplets, dumbbell: Dumbbell, footprints: Footprints, book: BookOpen,
  code: Code2, moon: Moon, sun: Sun, coffee: Coffee, pen: PenLine, brain: Brain,
  heart: Heart, music: Music, salad: Salad, alarm: AlarmClock, star: Star, leaf: Leaf,
} as const;

export type HabitIconName = keyof typeof ICONS;
export const HABIT_ICONS = Object.keys(ICONS) as HabitIconName[];

export function HIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const C = ICONS[(name as HabitIconName)] ?? Star;
  return <C size={size} className={className} strokeWidth={2.1} />;
}

export function IconBadge({ name, done }: { name: string; done?: boolean }) {
  return (
    <div
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] transition-colors duration-300"
      style={{
        background: done ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--surface-2)',
        color: done ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      <HIcon name={name} size={17} />
    </div>
  );
}

/* ————— animated checkbox ————— */

export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.82 }}
      animate={checked ? { scale: [1, 1.22, 1] } : { scale: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] border-2 transition-colors duration-200"
      style={{
        borderColor: checked ? 'var(--accent)' : 'var(--line-2)',
        background: checked ? 'var(--accent)' : 'transparent',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 12.5l4.6 4.6L19 7.5"
          stroke="var(--on-accent)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  );
}

/* ————— slim progress bar ————— */

export function Bar({ pct, h = 5 }: { pct: number; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height: h, background: 'var(--surface-2)' }} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'var(--accent)' }}
        initial={false}
        animate={{ width: `${Math.round(pct * 100)}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/* ————— material switch ————— */

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200"
      style={{
        background: on ? 'var(--accent)' : 'var(--surface-2)',
        boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--line-2)',
      }}
    >
      <motion.span
        className="absolute top-[3px] h-5 w-5 rounded-full"
        style={{ background: on ? 'var(--on-accent)' : 'var(--muted)' }}
        animate={{ left: on ? 23 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/* ————— bottom sheet ————— */

export function Sheet({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <motion.div
        className="absolute inset-0 z-40 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`absolute inset-x-0 bottom-0 z-50 flex max-h-[92%] flex-col overflow-hidden rounded-t-[26px] border-t border-[var(--line)] bg-[var(--surface)] ${wide ? '' : ''}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 650) onClose();
        }}
      >
        <div className="grid shrink-0 place-items-center pb-1 pt-2.5">
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--line-2)' }} />
        </div>
        <div className="overflow-y-auto px-5 pb-8 pt-1">{children}</div>
      </motion.div>
    </>
  );
}

/* ————— typography helpers ————— */

export function SheetTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>{children}</h2>
      {sub && <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
      {children}
    </div>
  );
}

export function ChipRow<T extends string>({
  options, value, onChange, render,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const sel = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-150"
            style={{
              background: sel ? 'var(--accent)' : 'var(--surface-2)',
              color: sel ? 'var(--on-accent)' : 'var(--muted)',
            }}
          >
            {render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

/* ————— empty state ————— */

export function EmptyState({
  title, sub, children,
}: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <Logo size={52} />
      <h2 className="mt-5 text-[19px] font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
      <p className="mt-1.5 max-w-[240px] text-[13.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>{sub}</p>
      {children && <div className="mt-6 flex gap-2.5">{children}</div>}
    </div>
  );
}

/* ————— buttons ————— */

export function PrimaryBtn({
  children, onClick, ghost, danger,
}: { children: ReactNode; onClick?: () => void; ghost?: boolean; danger?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14.5px] font-semibold"
      style={
        ghost
          ? { background: 'transparent', color: danger ? 'var(--danger)' : 'var(--text)', boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }
          : { background: danger ? 'var(--danger)' : 'var(--accent)', color: '#fff' }
      }
    >
      {children}
    </motion.button>
  );
}

/* ————— toasts ————— */

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((msg: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), msg });
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[70] flex justify-center px-8">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-full px-5 py-2.5 text-[13px] font-medium shadow-xl"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
