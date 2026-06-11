'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, Blocker, getBlockers, getGoals, resolveBlocker, setProgress } from '@/lib/api';
import { Goal } from '@/lib/pillars';
import { daysLeft, formatWeekEnding, getWeekEnding } from '@/lib/date';
import PillarCard from '@/components/PillarCard';
import BlockerItem from '@/components/BlockerItem';

const CACHE_KEY = 'ld:dashboard:v1';

interface CachedDashboard {
  weekEnding: string;
  goals: Goal[];
  blockers: Blocker[];
  savedAt: number;
}

function readCache(): CachedDashboard | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedDashboard) : null;
  } catch {
    return null;
  }
}

export default function TodayPage() {
  const router = useRouter();
  const weekEnding = useMemo(() => getWeekEnding(), []);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false); // showing cached data, fetch failed
  const [toast, setToast] = useState<string | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, number>>({}); // debounced values not yet written
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return true;
      }
      return false;
    },
    [router]
  );

  const refresh = useCallback(async () => {
    try {
      const [g, b] = await Promise.all([getGoals(weekEnding), getBlockers()]);
      setGoals(g);
      setBlockers(b);
      setStale(false);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ weekEnding, goals: g, blockers: b, savedAt: Date.now() })
        );
      } catch { /* cache write is best-effort */ }
    } catch (err) {
      if (handleAuthError(err)) return;
      // Fall back to cached data if we have it
      setGoals(prev => prev ?? readCache()?.goals ?? null);
      setBlockers(prev => (prev.length ? prev : readCache()?.blockers ?? []));
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [weekEnding, handleAuthError]);

  useEffect(() => {
    const cached = readCache();
    if (cached?.goals?.length) {
      setGoals(cached.goals);
      setBlockers(cached.blockers ?? []);
      setLoading(false);
    }
    refresh();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // Optimistic write, debounced per pillar so rapid stepper taps collapse into
  // one absolute-value write (the backend sets, not increments).
  const commitValue = useCallback(
    (pillar: string, value: number) => {
      setGoals(prev =>
        prev ? prev.map(g => (g.pillar === pillar ? { ...g, current: value } : g)) : prev
      );
      pending.current[pillar] = value;
      clearTimeout(timers.current[pillar]);
      timers.current[pillar] = setTimeout(async () => {
        delete pending.current[pillar];
        try {
          await setProgress(pillar, value, weekEnding);
        } catch (err) {
          if (handleAuthError(err)) return;
          showToast("Couldn't save — check your connection");
          refresh();
        }
      }, 450);
    },
    [weekEnding, refresh, showToast, handleAuthError]
  );

  // If the app is closed/backgrounded inside the debounce window, flush the
  // pending writes immediately (the requests are keepalive, so they survive).
  useEffect(() => {
    const flush = () => {
      for (const [pillar, value] of Object.entries(pending.current)) {
        clearTimeout(timers.current[pillar]);
        delete pending.current[pillar];
        setProgress(pillar, value, weekEnding).catch(() => {});
      }
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [weekEnding]);

  const onResolve = useCallback(
    async (blocker: Blocker) => {
      setBlockers(prev => prev.filter(b => b.row !== blocker.row));
      try {
        await resolveBlocker(blocker.row, blocker.timestamp);
      } catch (err) {
        if (handleAuthError(err)) return;
        setBlockers(prev => [...prev, blocker].sort((a, b) => a.row - b.row));
        showToast("Couldn't resolve blocker — try again");
      }
    },
    [showToast, handleAuthError]
  );

  const remaining = daysLeft(weekEnding);

  return (
    <main className="animate-fade-up">
      <header className="pt-2">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">Today</h1>
        <p className="mt-0.5 text-[15px] text-ink-2">
          Week ending {formatWeekEnding(weekEnding)}
          <span className="text-ink-3"> · </span>
          {remaining === 0 ? 'last day' : `${remaining} day${remaining === 1 ? '' : 's'} left`}
        </p>
        <WeekDots remaining={remaining} />
      </header>

      {stale && (
        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2">
          Offline — showing last synced data
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading && !goals && <Skeleton />}
        {!loading && goals === null && (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-2">
            Couldn’t load this week’s goals.
            <button onClick={() => { setLoading(true); refresh(); }}
                    className="mt-3 block w-full rounded-xl bg-surface-2 py-3 font-semibold text-ink">
              Retry
            </button>
          </div>
        )}
        {goals?.map(goal => (
          <PillarCard key={goal.pillar} goal={goal} onSetValue={commitValue} />
        ))}
      </div>

      {blockers.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-3">
            Active blockers
          </h2>
          <div className="mt-3 space-y-3">
            {blockers.map(b => (
              <BlockerItem key={`${b.row}-${b.timestamp}`} blocker={b} onResolve={onResolve} />
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-50 flex justify-center px-6">
          <div className="animate-fade-up rounded-full border border-line bg-surface-2/95
                          px-5 py-3 text-sm font-medium shadow-xl shadow-black/40 backdrop-blur-xl">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

// Mon–Sun progress dots; today and elapsed days are filled
function WeekDots({ remaining }: { remaining: number }) {
  const todayIdx = 6 - remaining; // Mon = 0 … Sun = 6
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < todayIdx ? 'w-1.5 bg-ink-3'
            : i === todayIdx ? 'w-5 bg-accent'
            : 'w-1.5 bg-surface-2'
          }`}
        />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-surface"
             style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </>
  );
}
