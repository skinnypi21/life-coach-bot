'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import TabBar from '@/components/TabBar';
import InstallPrompt from '@/components/InstallPrompt';

// Client-side gate: real protection is the backend bearer check; this just
// routes a logged-out user to /login instead of showing failed requests.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <div className="px-5 pt-[max(env(safe-area-inset-top),20px)] pb-32">
        {children}
      </div>
      <TabBar />
      <InstallPrompt />
    </div>
  );
}
