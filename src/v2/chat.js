// v2 AI coach chat — Claude tool-use loop over the same Sheets writes the
// rest of the v2 API uses. Conversation history lives in Postgres; every
// exchange is also appended to the v1 "Daily Check-ins" sheet (type
// "app_chat") so v1 and v2 history stay side by side during the parallel run.
//
// Progress updates are ABSOLUTE: Claude sees current progress in the system
// prompt and sets the new total via update_progress, which fixes v1's
// additive, non-idempotent parser (limitation #7). Repeating "I've worked out
// twice this week" keeps current at 2, it doesn't become 4.
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { getCurrentWeekGoals, logCheckIn, PILLARS } = require('../sheets/queries');
const { updateProgressForWeek, logBlockerStrict } = require('./queries');
const { loadRecentMessages, saveMessage } = require('./db');

const MAX_TOOL_ROUNDS = 5;
const HISTORY_LIMIT = 20;
const MAX_TOKENS = 1024;

const PILLAR_LABELS = {
  social_life: 'Social Life',
  physical_health: 'Physical Health',
  mental_health: 'Mental Health',
  meaningful_job: 'Meaningful Job',
  hobbies: 'Hobbies',
  manifesto_life_design: 'Life Design',
  intellectual_stimulation: 'Intellectual Stimulation',
  meaning_purpose: 'Meaning & Purpose',
  romantic_love: 'Romantic Love',
  financial: 'Financial',
  trying_something_new: 'Trying Something New'
};

let client = null;
function getClient() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

const TOOLS = [
  {
    name: 'update_progress',
    description:
      "Set a pillar's progress for the current week to an ABSOLUTE value — not an increment. " +
      'Compute the new total from the current progress shown in your context. Call this whenever ' +
      'Peter reports activity toward a trackable goal (e.g. went to the gym, had a coffee with a ' +
      'friend, read a chapter). If he restates progress you already recorded, set the same value again.',
    input_schema: {
      type: 'object',
      properties: {
        pillar: { type: 'string', enum: PILLARS, description: 'Pillar key' },
        new_value: {
          type: 'integer',
          minimum: 0,
          description: 'New absolute progress count for the week'
        }
      },
      required: ['pillar', 'new_value']
    }
  },
  {
    name: 'log_blocker',
    description:
      'Log a blocker when Peter says he is stuck, procrastinating, avoiding, or blocked on a goal. ' +
      'Pick the pillar the blocker belongs to.',
    input_schema: {
      type: 'object',
      properties: {
        pillar: { type: 'string', enum: PILLARS, description: 'Pillar key' },
        description: {
          type: 'string',
          description: "Short description of the blocker, close to Peter's own words"
        }
      },
      required: ['pillar', 'description']
    }
  },
  {
    name: 'get_goals',
    description:
      "Fetch the current week's goals fresh from the sheet. Rarely needed — goals and progress are " +
      'already in your context — but available if you need to re-check after an update.',
    input_schema: { type: 'object', properties: {} }
  }
];

function buildSystemPrompt(goals, weekEnding) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const goalLines = (goals || [])
    .map(g => {
      const label = PILLAR_LABELS[g.pillar] || g.pillar;
      const tracking = g.trackable
        ? `trackable, progress ${g.current}/${g.target}`
        : 'not trackable';
      return `- ${g.pillar} (${label}): "${g.goal}" [${tracking}]`;
    })
    .join('\n');

  return `You are Peter's accountability coach for his Life Design system — supportive but pragmatic. This is a chat UI on a phone, so keep replies concise (a few sentences). Be warm and direct; never sycophantic.

The system tracks 11 life pillars. This week's goals (week ending ${weekEnding || 'current'}):
${goalLines || '(no goals found for this week)'}

Today is ${dateStr} (America/New_York).

How to act:
- When Peter reports activity toward a trackable goal, call update_progress with the new ABSOLUTE total (current progress is listed above — add what he just reported to it). If he restates something already counted, set the same value, don't double-count.
- When he mentions being stuck, procrastinating, or blocked, call log_blocker with the right pillar.
- Ask at most ONE clarifying question, and only when genuinely ambiguous (e.g. you can't tell which pillar he means). Otherwise act, then confirm briefly what you recorded.
- Acknowledge wins without gushing; nudge on neglected pillars when it's natural, not every message.`;
}

// Execute one tool call. Mutates `changes` (structured list for UI chips),
// `toolCallLog` (debug record persisted to Postgres), and the in-memory
// `goals` array (so later rounds in the same loop see updated progress).
async function executeTool(name, input, weekEnding, goals, changes, toolCallLog) {
  try {
    let result;
    if (name === 'update_progress') {
      const { pillar, new_value: value } = input || {};
      if (!PILLARS.includes(pillar)) throw new Error(`Unknown pillar: ${pillar}`);
      if (!Number.isInteger(value) || value < 0 || value > 999) {
        throw new Error('new_value must be an integer 0–999');
      }
      const { weekEnding: writtenWeek } = await updateProgressForWeek(pillar, value, weekEnding);
      const goal = (goals || []).find(g => g.pillar === pillar);
      if (goal) goal.current = value;
      changes.push({
        type: 'progress',
        pillar,
        value,
        target: goal && goal.trackable ? goal.target : null
      });
      result = `Set ${pillar} progress to ${value} for week ending ${writtenWeek}.`;
    } else if (name === 'log_blocker') {
      const { pillar, description } = input || {};
      if (!PILLARS.includes(pillar)) throw new Error(`Unknown pillar: ${pillar}`);
      if (!description || !String(description).trim()) throw new Error('description required');
      const goal = (goals || []).find(g => g.pillar === pillar);
      await logBlockerStrict(pillar, goal ? goal.goal : '', String(description).trim());
      changes.push({ type: 'blocker', pillar, description: String(description).trim() });
      result = `Logged blocker on ${pillar}.`;
    } else if (name === 'get_goals') {
      const fresh = await getCurrentWeekGoals(weekEnding);
      result = JSON.stringify(fresh || []);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
    toolCallLog.push({ name, input, ok: true });
    return { result, isError: false };
  } catch (err) {
    logger.error(`v2 chat tool ${name} failed`, err.message);
    toolCallLog.push({ name, input, ok: false, error: err.message });
    return { result: `Error: ${err.message}`, isError: true };
  }
}

function extractText(response) {
  return response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

// Main entry: one user message in, final reply + structured changes out.
async function handleChat(userMessage, weekEnding) {
  // Goals are queried live per request (never cached) so the system prompt
  // always reflects what's currently in the sheet.
  const [goals, history] = await Promise.all([
    getCurrentWeekGoals(weekEnding),
    loadRecentMessages(HISTORY_LIMIT)
  ]);

  const messages = history.map(m => ({ role: m.role, content: m.content }));
  // The API requires the first message to be role "user"; consecutive
  // same-role messages are fine (they get combined into one turn).
  while (messages.length && messages[0].role !== 'user') messages.shift();
  messages.push({ role: 'user', content: userMessage });

  const system = buildSystemPrompt(goals, weekEnding);
  const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';
  const anthropic = getClient();

  const changes = [];
  const toolCallLog = [];

  let response = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system,
    tools: TOOLS,
    messages
  });

  let rounds = 0;
  while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    const results = [];
    for (const tu of toolUses) {
      const { result, isError } = await executeTool(
        tu.name, tu.input, weekEnding, goals, changes, toolCallLog
      );
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: result,
        is_error: isError
      });
    }
    messages.push({ role: 'user', content: results });

    response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      tools: TOOLS,
      messages
    });
  }

  const reply =
    extractText(response) ||
    (changes.length ? 'Done — recorded that for you.' : "Sorry, I didn't get a response — try again?");

  // Persist the exchange only after a successful run, so a failed request can
  // be retried without leaving a half-recorded turn in history. The changes
  // list rides along in tool_calls jsonb so chips survive a reload.
  await saveMessage('user', userMessage);
  await saveMessage('assistant', reply, { calls: toolCallLog, changes });

  // Side-log to the v1 "Daily Check-ins" sheet. logCheckIn swallows its own
  // errors, which is what we want — a failed side-log shouldn't fail the chat.
  const progressChanges = changes.filter(c => c.type === 'progress');
  const blockerChanges = changes.filter(c => c.type === 'blocker');
  await logCheckIn(
    'app_chat',
    userMessage,
    reply,
    progressChanges.map(c => c.pillar).join(', ') || null,
    progressChanges.map(c => c.value).join(', ') || null,
    blockerChanges.length > 0,
    blockerChanges.map(c => c.description).join(' | ') || null
  );

  return { reply, changes };
}

module.exports = { handleChat };
