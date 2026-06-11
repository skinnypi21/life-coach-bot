'use client';

import type { Blocker } from '@/lib/api';
import { pillarByKey } from '@/lib/pillars';
import { relativeAge } from '@/lib/date';

export default function BlockerItem({
  blocker,
  onResolve,
}: {
  blocker: Blocker;
  onResolve: (b: Blocker) => void;
}) {
  const pillar = pillarByKey(blocker.pillar);
  const color = pillar?.color ?? 'var(--color-ink-3)';

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
      style={{ boxShadow: `inset 3px 0 0 0 ${color}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em]"
             style={{ color }}>
          <span>{pillar?.emoji}</span>
          <span className="truncate">{pillar?.label ?? blocker.pillar}</span>
          <span className="font-medium normal-case tracking-normal text-ink-3">
            · {relativeAge(blocker.timestamp)}
          </span>
        </div>
        <p className="mt-1 text-[14px] leading-snug text-ink-2">{blocker.description}</p>
      </div>
      <button
        type="button"
        aria-label="Mark resolved"
        onClick={() => onResolve(blocker)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                   bg-surface-2 text-ink-3 transition-[transform,color,background-color]
                   active:scale-90 active:bg-[#4ade8024] active:text-[#4ade80]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
