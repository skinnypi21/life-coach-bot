'use client';

import { Goal, STATUS_LABELS, pillarByKey } from '@/lib/pillars';

export default function PillarCard({
  goal,
  onSetValue,
}: {
  goal: Goal;
  onSetValue: (pillar: string, value: number) => void;
}) {
  const pillar = pillarByKey(goal.pillar);
  if (!pillar) return null;
  const color = pillar.color;
  const hasGoal = goal.goal && goal.goal !== 'No goal set';

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[19px] leading-none">{pillar.emoji}</span>
          <h2
            className="truncate text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color }}
          >
            {pillar.label}
          </h2>
        </div>
        {!goal.trackable && hasGoal && (
          <StatusPill
            status={Math.min(goal.current, 2)}
            color={color}
            onTap={() => onSetValue(goal.pillar, (Math.min(goal.current, 2) + 1) % 3)}
          />
        )}
      </div>

      <p className={`mt-2 text-[15px] leading-snug ${hasGoal ? 'text-ink' : 'italic text-ink-3'}`}>
        {hasGoal ? goal.goal : 'No goal set this week'}
      </p>

      {goal.trackable && hasGoal && (
        <div className="mt-3.5 flex items-center gap-4">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full"
               style={{ backgroundColor: `${color}26` }}>
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.min(100, (goal.current / Math.max(goal.target, 1)) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>

          <div className="flex items-center gap-1">
            <StepButton
              label={`Decrease ${pillar.label}`}
              disabled={goal.current <= 0}
              onTap={() => onSetValue(goal.pillar, Math.max(0, goal.current - 1))}
            >
              <MinusIcon />
            </StepButton>
            <span className="min-w-[44px] text-center text-[15px] font-semibold tabular-nums">
              <span style={{ color: goal.current >= goal.target ? color : undefined }}>
                {goal.current}
              </span>
              <span className="text-ink-3">/{goal.target}</span>
            </span>
            <StepButton
              label={`Increase ${pillar.label}`}
              onTap={() => onSetValue(goal.pillar, goal.current + 1)}
            >
              <PlusIcon />
            </StepButton>
          </div>
        </div>
      )}
    </section>
  );
}

function StepButton({
  children,
  onTap,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onTap: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onTap}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2
                 text-ink-2 transition-[transform,opacity] active:scale-90 active:opacity-70
                 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function StatusPill({
  status,
  color,
  onTap,
}: {
  status: number;
  color: string;
  onTap: () => void;
}) {
  const styles = [
    { backgroundColor: 'transparent', color: 'var(--color-ink-3)', boxShadow: 'inset 0 0 0 1px var(--color-line)' },
    { backgroundColor: `${color}24`, color },
    { backgroundColor: '#4ade8024', color: '#4ade80' },
  ][status];

  return (
    // -m-2/p-2 padding extends the hit area to ≥44px without growing the pill
    <button type="button" onClick={onTap} className="-m-2 shrink-0 p-2" aria-label="Cycle status">
      <span
        className="flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors"
        style={styles}
      >
        {status === 2 && <CheckIcon />}
        {STATUS_LABELS[status]}
      </span>
    </button>
  );
}

const icon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function MinusIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...icon}><path d="M6 12h12" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...icon}><path d="M12 6v12M6 12h12" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...icon}><path d="m5 13 4 4L19 7" /></svg>;
}
