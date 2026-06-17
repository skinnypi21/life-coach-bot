'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // In dev, the SW's cache-first strategy for /_next/static/ serves stale
    // Turbopack chunks (dev chunk URLs aren't content-hashed like prod).
    // Unregister any leftover SW instead of registering one.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister()))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (e.g. private browsing) shouldn't break the app
    });
  }, []);
  return null;
}
