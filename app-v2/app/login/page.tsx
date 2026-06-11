'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import InstallPrompt from '@/components/InstallPrompt';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/today');
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      router.replace('/today');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-8 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm animate-fade-up">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="mx-auto mb-5 h-20 w-20 rounded-[22%] shadow-lg shadow-black/40"
        />
        <h1 className="text-center text-2xl font-bold tracking-tight">Life Design</h1>
        <p className="mt-1 text-center text-sm text-ink-2">Your week, on purpose.</p>

        <form onSubmit={onSubmit} className={`mt-9 ${error ? 'animate-shake' : ''}`}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-line bg-surface px-5 py-4 text-ink
                       placeholder:text-ink-3 outline-none focus:border-accent/50
                       transition-colors"
          />
          {error && (
            <p className="mt-3 text-center text-sm text-danger">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-4 w-full rounded-2xl bg-accent py-4 text-base font-semibold
                       text-[#06302a] transition-opacity active:opacity-80
                       disabled:opacity-40"
          >
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
      <InstallPrompt />
    </main>
  );
}
