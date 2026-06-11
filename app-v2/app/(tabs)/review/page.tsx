import ComingSoon from '@/components/ComingSoon';

const V1_REVIEW_URL = 'https://life-coach-bot.vercel.app/review';

export default function ReviewPage() {
  return (
    <ComingSoon
      emoji="📝"
      title="Weekly Review"
      phase="Phase 4"
      note="The Sunday review moves in-app soon. During the parallel run, keep using the current form:"
    >
      <a
        href={V1_REVIEW_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 rounded-2xl bg-accent px-6 py-3.5 text-sm font-semibold
                   text-[#06302a] transition-opacity active:opacity-80"
      >
        Open current review form
      </a>
    </ComingSoon>
  );
}
