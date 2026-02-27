const { formatDate } = require('../utils/date');

const PILLAR_NAMES = {
  social_life: '👥 Social Life',
  physical_health: '💪 Physical Health',
  mental_health: '🧠 Mental Health',
  meaningful_job: '💼 Meaningful Job',
  hobbies: '🎨 Hobbies',
  manifesto_life_design: '📋 Life Design',
  intellectual_stimulation: '📚 Intellectual Stimulation',
  meaning_purpose: '🌟 Meaning & Purpose',
  romantic_love: '❤️ Romantic Love',
  financial: '💰 Financial',
  trying_something_new: '🚀 Trying Something New'
};

function formatGoalsList(goals) {
  if (!goals || goals.length === 0) return 'No goals set yet.';

  return goals.map(g => {
    const name = PILLAR_NAMES[g.pillar] || g.pillar;
    const progress = g.trackable
      ? ` (${g.current}/${g.target})`
      : '';
    const score = g.score > 0 ? ` — Score: ${g.score}/10` : '';
    return `${name}: ${g.goal}${progress}${score}`;
  }).join('\n');
}

function morningCheckIn(goals) {
  const goalsList = formatGoalsList(goals);
  return `☀️ *Good morning, Peter!*

Here's what you're working on this week:

${goalsList}

_What progress did you make yesterday? Just tell me naturally — e.g. "I went to the gym" or "I read for 30 minutes"._`;
}

function eveningCheckIn(goals) {
  const goalsList = formatGoalsList(goals);
  return `🌙 *Evening check-in time!*

Here's your progress so far:

${goalsList}

_How did today go? Any wins or blockers to share?_`;
}

function midWeekCheckIn(goals) {
  const goalsList = formatGoalsList(goals);
  return `📊 *Mid-week check-in!*

We're halfway through the week. Here's where you stand:

${goalsList}

_Anything you need to adjust or push harder on? Tell me what's going on._`;
}

function weeklyReviewReminder(webAppUrl) {
  return `🎯 *Weekend Review Time!*

Another week is wrapping up! Time to reflect and plan ahead.

👉 [Open your Weekly Review](${webAppUrl})

It only takes 10-15 minutes and sets you up for a great week ahead.`;
}

function mondayNag(webAppUrl) {
  return `👋 *Hey — did you do your weekly review?*

I noticed you haven't completed it yet. Reviews are the secret to actually improving week over week!

👉 [Complete your Weekly Review](${webAppUrl})`;
}

function progressUpdated(pillar, newValue, goal) {
  const name = PILLAR_NAMES[pillar] || pillar;
  return `✅ Got it! Updated *${name}* progress to ${newValue}.\n\nGoal: _${goal}_`;
}

function blockerLogged(pillar, blockerText) {
  const name = PILLAR_NAMES[pillar] || pillar;
  return `📌 Logged a blocker for *${name}*:\n_"${blockerText}"_\n\nI'll keep track of this so we can address it.`;
}

function helpMessage() {
  return `🤖 *Life Design Coach — Help*

Here's what I can do:

/morning — Start a morning check-in
/evening — Start an evening check-in
/goals — See your current week's goals & progress
/help — Show this message

You can also just *talk to me naturally*:
• "I went for a run today" → updates physical health
• "I called my mom" → updates social life
• "I'm blocked because work is crazy" → logs a blocker

I check in with you automatically:
• 9 AM daily — morning check-in
• 6 PM daily — evening check-in
• Wednesday — mid-week progress check
• Sunday 7 PM — weekly review reminder`;
}

function goalsMessage(goals) {
  if (!goals) return '📋 No goals found for this week yet.';

  const lines = goals.map(g => {
    const name = PILLAR_NAMES[g.pillar] || g.pillar;
    const progress = g.trackable
      ? `\n   Progress: ${g.current}/${g.target}`
      : '';
    const score = g.score > 0 ? `\n   Score: ${g.score}/10` : '';
    return `${name}\n   Goal: ${g.goal}${progress}${score}`;
  });

  return `📋 *Your Goals This Week*\n\n${lines.join('\n\n')}`;
}

function unknownMessage() {
  return `I heard you! 👂

I didn't quite catch which goal area that relates to. Try being a bit more specific, like:
• "I went to the gym" (physical health)
• "I meditated for 10 minutes" (mental health)
• "I worked on my side project" (hobbies)

Or type /goals to see your current goals, or /help for more options.`;
}

function startMessage() {
  return `👋 *Hey Peter! I'm your Life Design Coach.*

I'm here to help you stay on track with your weekly goals across all the important areas of your life.

Here's how to get started:
• Type /goals to see this week's goals
• Type /morning for a morning check-in
• Type /evening for an evening check-in
• Or just tell me what you did today!

Type /help anytime to see all my commands.`;
}

module.exports = {
  morningCheckIn, eveningCheckIn, midWeekCheckIn,
  weeklyReviewReminder, mondayNag, progressUpdated,
  blockerLogged, helpMessage, goalsMessage,
  unknownMessage, startMessage, PILLAR_NAMES
};
