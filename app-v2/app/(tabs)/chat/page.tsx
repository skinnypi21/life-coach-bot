'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, ChatChange, ChatMessage, getChatHistory, sendChat } from '@/lib/api';
import { pillarByKey } from '@/lib/pillars';
import { getWeekEnding } from '@/lib/date';

export default function ChatPage() {
  const router = useRouter();
  const weekEnding = useMemo(() => getWeekEnding(), []);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const showError = useCallback((msg: string) => {
    setError(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4000);
  }, []);

  // Load persisted history on mount (GET /api/v2/chat/history)
  useEffect(() => {
    (async () => {
      try {
        setMessages(await getChatHistory());
      } catch (err) {
        if (handleAuthError(err)) return;
        setMessages([]);
        showError("Couldn't load chat history");
      }
    })();
  }, [handleAuthError, showError]);

  // Keep the latest message in view. Scrolling to the document end (rather
  // than a sentinel) means the list's bottom padding — which already clears
  // the fixed input bar and tab bar — stays visible below the last message.
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight });
  }, [messages, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setMessages(prev => [...(prev ?? []), { role: 'user', content: text }]);

    try {
      const { reply, changes } = await sendChat(text, weekEnding);
      setMessages(prev => [...(prev ?? []), { role: 'assistant', content: reply, changes }]);
    } catch (err) {
      if (handleAuthError(err)) return;
      // Roll back the optimistic bubble and put the text back in the input
      setMessages(prev => (prev ?? []).slice(0, -1));
      setInput(text);
      showError(err instanceof ApiError ? err.message : "Couldn't send — try again");
    } finally {
      setSending(false);
    }
  }, [input, sending, weekEnding, handleAuthError, showError]);

  // Note: the fade-up animation lives on an inner wrapper, not <main> — its
  // transform would otherwise become the containing block for the fixed
  // input bar and pin it to the content instead of the viewport.
  return (
    <main>
      <div className="animate-fade-up">
      <header className="pt-2">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">Coach</h1>
        <p className="mt-0.5 text-[15px] text-ink-2">
          Tell me how it&apos;s going — I&apos;ll keep score.
        </p>
      </header>

      <div className="mt-5 space-y-3 pb-20">
        {messages === null && <Skeleton />}

        {messages !== null && messages.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm leading-relaxed text-ink-2">
            No messages yet. Try something like{' '}
            <span className="text-ink">&ldquo;finally dragged myself to the gym today&rdquo;</span>{' '}
            — I&apos;ll update your goals for you.
          </div>
        )}

        {messages?.map((m, i) => (
          <MessageBubble key={m.id ?? `local-${i}`} message={m} />
        ))}

        {sending && <TypingIndicator />}
      </div>
      </div>

      {/* Input bar pinned above the tab bar */}
      <div
        className="fixed inset-x-0 z-40 bg-bg/80 backdrop-blur-xl"
        style={{ bottom: 'calc(53px + env(safe-area-inset-bottom))' }}
      >
        <form
          className="mx-auto flex max-w-lg items-center gap-2 px-5 py-2.5"
          onSubmit={e => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message your coach…"
            enterKeyHint="send"
            className="min-h-[44px] flex-1 rounded-full border border-line bg-surface px-4
                       text-[16px] text-ink placeholder:text-ink-3 outline-none
                       focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                       bg-accent text-bg transition-opacity disabled:opacity-30"
          >
            <SendIcon />
          </button>
        </form>
      </div>

      {error && (
        <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-50 flex justify-center px-6">
          <div className="animate-fade-up rounded-full border border-line bg-surface-2/95
                          px-5 py-3 text-sm font-medium shadow-xl shadow-black/40 backdrop-blur-xl">
            {error}
          </div>
        </div>
      )}
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed
                    ${isUser
                      ? 'rounded-br-md bg-accent font-medium text-bg'
                      : 'rounded-bl-md border border-line bg-surface text-ink'}`}
      >
        {message.content}
      </div>
      {!isUser && (message.changes?.length ?? 0) > 0 && (
        <div className="mt-1.5 flex max-w-[85%] flex-wrap gap-1.5">
          {message.changes!.map((c, i) => (
            <ChangeChip key={i} change={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// Confirmation chip under an assistant message, e.g. "💪 Physical Health: 2/4"
function ChangeChip({ change }: { change: ChatChange }) {
  const pillar = pillarByKey(change.pillar);
  const emoji = pillar?.emoji ?? '✅';
  const label = pillar?.label ?? change.pillar;
  const detail =
    change.type === 'progress'
      ? `${change.value}${change.target ? `/${change.target}` : ''}`
      : 'blocker logged';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface
                 px-2.5 py-1 text-[12px] font-semibold"
      style={{ color: pillar?.color }}
    >
      <span>{emoji}</span>
      <span>
        {label}: {detail}
      </span>
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line
                      bg-surface px-4 py-3.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className="h-12 w-3/5 animate-pulse rounded-2xl bg-surface" />
      <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-surface" />
      <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-surface" />
    </>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
