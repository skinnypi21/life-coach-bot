export default function ComingSoon({
  emoji,
  title,
  phase,
  note,
  children,
}: {
  emoji: string;
  title: string;
  phase: string;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center text-center animate-fade-up">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-surface text-4xl">
        {emoji}
      </div>
      <h1 className="mt-6 text-xl font-bold tracking-tight">{title}</h1>
      <span className="mt-3 rounded-full border border-line bg-surface px-3 py-1 text-xs
                       font-semibold tracking-wide text-accent">
        {phase}
      </span>
      <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-ink-2">{note}</p>
      {children}
    </main>
  );
}
