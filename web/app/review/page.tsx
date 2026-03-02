'use client';

import { useState, useEffect } from 'react';
import { PILLARS, Goal } from '../../lib/pillars';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ReviewData {
  scores: Record<string, number>;
  satisfaction: Record<string, number>;
  goals: Record<string, string>;
  trackable: Record<string, boolean>;
  target: Record<string, number>;
  current: Record<string, number>;
  nextGoals: Record<string, string>;
  reflectionInsight: string;
  reflectionDifferent: string;
}

function ScoreButton({ value, selected, onClick, color }: { value: number; selected: boolean; onClick: () => void; color?: 'blue' | 'purple' }) {
  const blueColors: Record<number, string> = {
    1: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    2: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    3: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
    4: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
    5: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200',
    6: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200',
    7: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    8: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    9: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
    10: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
  };

  const blueSelected: Record<number, string> = {
    1: 'bg-red-500 text-white border-red-500',
    2: 'bg-red-500 text-white border-red-500',
    3: 'bg-orange-500 text-white border-orange-500',
    4: 'bg-orange-500 text-white border-orange-500',
    5: 'bg-yellow-500 text-white border-yellow-500',
    6: 'bg-yellow-500 text-white border-yellow-500',
    7: 'bg-green-500 text-white border-green-500',
    8: 'bg-green-500 text-white border-green-500',
    9: 'bg-emerald-500 text-white border-emerald-500',
    10: 'bg-emerald-500 text-white border-emerald-500',
  };

  const purpleIdle = 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100';
  const purpleSelected = 'bg-purple-500 text-white border-purple-500';

  const idleClass   = color === 'purple' ? purpleIdle        : blueColors[value];
  const activeClass = color === 'purple' ? purpleSelected    : blueSelected[value];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${
        selected ? activeClass : idleClass
      }`}
    >
      {value}
    </button>
  );
}

export default function ReviewPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [review, setReview] = useState<ReviewData>({
    scores: {},
    satisfaction: {},
    goals: {},
    trackable: {},
    target: {},
    current: {},
    nextGoals: {},
    reflectionInsight: '',
    reflectionDifferent: '',
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/goals`);
      const data = await res.json();
      if (data.success && data.goals) {
        setGoals(data.goals);
        const scores: Record<string, number> = {};
        const satisfaction: Record<string, number> = {};
        const goalTexts: Record<string, string> = {};
        const trackable: Record<string, boolean> = {};
        const target: Record<string, number> = {};
        const current: Record<string, number> = {};
        const nextGoals: Record<string, string> = {};
        data.goals.forEach((g: Goal) => {
          scores[g.pillar]       = g.score || 0;
          satisfaction[g.pillar] = g.satisfaction || 0;
          goalTexts[g.pillar]    = g.goal;
          trackable[g.pillar]    = g.trackable;
          target[g.pillar]       = g.target;
          current[g.pillar]      = g.current;
          nextGoals[g.pillar]    = '';
        });
        setReview(r => ({ ...r, scores, satisfaction, goals: goalTexts, trackable, target, current, nextGoals }));
      }
    } catch {
      setError('Could not connect to backend. You can still fill in the form — set up the API URL to enable saving.');
    } finally {
      setLoading(false);
    }
  }

  function setScore(pillar: string, score: number) {
    setReview(r => ({ ...r, scores: { ...r.scores, [pillar]: score } }));
  }

  function setSatisfaction(pillar: string, val: number) {
    setReview(r => ({ ...r, satisfaction: { ...r.satisfaction, [pillar]: val } }));
  }

  function setGoalText(pillar: string, text: string) {
    setReview(r => ({ ...r, goals: { ...r.goals, [pillar]: text } }));
  }

  function setCurrent(pillar: string, val: number) {
    setReview(r => ({ ...r, current: { ...r.current, [pillar]: val } }));
  }

  function setNextGoal(pillar: string, text: string) {
    setReview(r => ({ ...r, nextGoals: { ...r.nextGoals, [pillar]: text } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        weekEnding,
        scores: review.scores,
        satisfaction: review.satisfaction,
        goals: review.goals,
        current: review.current,
        trackable: review.trackable,
        target: review.target,
        nextGoals: review.nextGoals,
        reflectionInsight: review.reflectionInsight,
        reflectionDifferent: review.reflectionDifferent,
      };

      const res = await fetch(`${API_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError('Failed to submit review. Please try again.');
      }
    } catch {
      setError('Could not connect to backend. Make sure the bot server is running.');
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date();
  const weekEndingDate = new Date(today);
  const daysUntilSunday = today.getDay() === 0 ? 0 : 7 - today.getDay();
  weekEndingDate.setDate(today.getDate() + daysUntilSunday);
  // Format as YYYY-MM-DD using local time (avoids UTC rollover issue)
  const weekEnding = `${weekEndingDate.getFullYear()}-${String(weekEndingDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndingDate.getDate()).padStart(2, '0')}`;
  const weekEndingStr = weekEndingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Review Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Amazing work reflecting on your week. Your scores have been saved and your Telegram bot has been notified.
          </p>
          <p className="text-gray-500 text-sm">
            See you next Sunday! 🚀
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📊</div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Review</h1>
          <p className="text-gray-500 mt-2">Week ending {weekEndingStr}</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pillar cards */}
          {PILLARS.map((pillar) => {
            const goalText  = review.goals[pillar.key] || '';
            const score     = review.scores[pillar.key] || 0;
            const sat       = review.satisfaction[pillar.key] || 0;
            const isTrackable = review.trackable[pillar.key];
            const currentVal  = review.current[pillar.key] || 0;
            const targetVal   = review.target[pillar.key] || 1;

            return (
              <div key={pillar.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{pillar.emoji}</span>
                  <h2 className="text-lg font-semibold text-gray-900">{pillar.label}</h2>
                </div>

                {/* Goal text */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                    Goal for this week
                  </label>
                  <input
                    type="text"
                    value={goalText}
                    onChange={e => setGoalText(pillar.key, e.target.value)}
                    placeholder="What was your goal this week?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                {/* Trackable progress */}
                {isTrackable && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                      Progress ({currentVal}/{targetVal})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={currentVal}
                      onChange={e => setCurrent(pillar.key, parseInt(e.target.value) || 0)}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}

                {/* Score */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Goal completion score {score > 0 && <span className="text-blue-600 font-bold">{score}/10</span>}
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <ScoreButton
                        key={n}
                        value={n}
                        selected={score === n}
                        onClick={() => setScore(pillar.key, n)}
                      />
                    ))}
                  </div>
                </div>

                {/* Satisfaction */}
                <div>
                  <label className="text-xs font-medium text-purple-500 uppercase tracking-wide mb-2 block">
                    Overall satisfaction with this area {sat > 0 && <span className="text-purple-600 font-bold">{sat}/10</span>}
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <ScoreButton
                        key={n}
                        value={n}
                        selected={sat === n}
                        onClick={() => setSatisfaction(pillar.key, n)}
                        color="purple"
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Reflection section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💭</span>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Reflection</h2>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                What was your biggest insight this week?
              </label>
              <textarea
                value={review.reflectionInsight}
                onChange={e => setReview(r => ({ ...r, reflectionInsight: e.target.value }))}
                placeholder="What did you learn about yourself or your goals?"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                What would you do differently next week?
              </label>
              <textarea
                value={review.reflectionDifferent}
                onChange={e => setReview(r => ({ ...r, reflectionDifferent: e.target.value }))}
                placeholder="Any adjustments to your approach or goals?"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>

          {/* Next week's goals */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <h2 className="text-lg font-semibold text-gray-900">Next Week&apos;s Goals</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Optional — set your goals for next week and they&apos;ll be saved automatically.
            </p>
            <div className="space-y-3">
              {PILLARS.map(pillar => (
                <div key={pillar.key}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                    {pillar.emoji} {pillar.label}
                  </label>
                  <input
                    type="text"
                    value={review.nextGoals[pillar.key] || ''}
                    onChange={e => setNextGoal(pillar.key, e.target.value)}
                    placeholder="Goal for next week..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {submitting ? '⏳ Submitting...' : '✅ Submit Weekly Review'}
          </button>

          <p className="text-center text-gray-400 text-xs pb-8">
            Your review will be saved to Google Sheets and you&apos;ll get a Telegram confirmation.
          </p>
        </form>
      </div>
    </div>
  );
}
