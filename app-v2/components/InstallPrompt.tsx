'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'ld:install-dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari legacy flag
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// First-run iOS install walkthrough. Web push on iOS (16.4+) only works after
// the app is added to the home screen, so this flow is load-bearing — shown
// until installed or explicitly dismissed.
export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (isIOS() && !isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
        setShow(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="animate-sheet-up mx-auto max-w-sm rounded-3xl border border-line
                      bg-surface-2/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <h2 className="text-lg font-bold">Install Life Design</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          Add it to your home screen to use it as an app and receive notifications.
        </p>

        <ol className="mt-5 space-y-4">
          <Step n={1}>
            Tap the <ShareIcon /> <strong className="text-ink">Share</strong> button in Safari
          </Step>
          <Step n={2}>
            Choose <strong className="text-ink">Add to Home Screen</strong>
          </Step>
          <Step n={3}>
            Open <strong className="text-ink">Life Design</strong> from the new icon
          </Step>
        </ol>

        <button
          onClick={() => {
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
            setShow(false);
          }}
          className="mt-6 w-full rounded-2xl bg-surface py-3.5 text-sm font-semibold
                     text-ink-2 transition-opacity active:opacity-70"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                       bg-accent/15 text-xs font-bold text-accent">
        {n}
      </span>
      <span className="text-sm text-ink-2">{children}</span>
    </li>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-0.5 text-accent" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}
