const { getCurrentWeekGoals, updateProgress, logCheckIn, logBlocker, getActiveBlockers } = require('../sheets/queries');
const { parseMessage } = require('./parser');
const messages = require('./messages');
const logger = require('../utils/logger');

// Handle /start command
async function handleStart(bot, chatId) {
  const text = messages.startMessage();
  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

// Handle /help command
async function handleHelp(bot, chatId) {
  const text = messages.helpMessage();
  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

// Handle /goals command
async function handleGoals(bot, chatId) {
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.goalsMessage(goals);
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error('Error in handleGoals', err.message);
    await bot.sendMessage(chatId, '❌ Sorry, I had trouble fetching your goals. Try again in a moment.');
  }
}

// Handle /morning command
async function handleMorning(bot, chatId) {
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.morningCheckIn(goals);
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    await logCheckIn('morning_command', '/morning', text);
  } catch (err) {
    logger.error('Error in handleMorning', err.message);
    await bot.sendMessage(chatId, '❌ Sorry, I had trouble with the morning check-in. Try again in a moment.');
  }
}

// Handle /evening command
async function handleEvening(bot, chatId) {
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.eveningCheckIn(goals);
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    await logCheckIn('evening_command', '/evening', text);
  } catch (err) {
    logger.error('Error in handleEvening', err.message);
    await bot.sendMessage(chatId, '❌ Sorry, I had trouble with the evening check-in. Try again in a moment.');
  }
}

// Handle free-form text messages
async function handleTextMessage(bot, chatId, userMessage) {
  try {
    const parsed = parseMessage(userMessage);
    logger.info('Parsed message', parsed);

    let botResponse = '';
    let goalUpdated = null;
    let progressValue = null;

    if (parsed.pillar) {
      // Get current goals to find the goal text
      const goals = await getCurrentWeekGoals();
      const goal = goals ? goals.find(g => g.pillar === parsed.pillar) : null;

      // Update progress if we have a trackable goal
      if (goal && goal.trackable && parsed.value !== null) {
        const newValue = goal.current + parsed.value;
        const updated = await updateProgress(parsed.pillar, newValue);

        if (updated) {
          goalUpdated = parsed.pillar;
          progressValue = newValue;
          botResponse = messages.progressUpdated(parsed.pillar, newValue, goal.goal);
        } else {
          botResponse = `I recognized you're working on *${messages.PILLAR_NAMES[parsed.pillar]}*, but had trouble updating the tracker. No worries though!`;
        }
      } else {
        // Non-trackable pillar — just acknowledge
        const name = messages.PILLAR_NAMES[parsed.pillar] || parsed.pillar;
        botResponse = `💪 Nice work on *${name}*! Keep it up.\n\n_Goal: ${goal ? goal.goal : 'No goal set'}_`;
      }

      // Log blocker if detected
      if (parsed.hasBlocker && goal) {
        await logBlocker(parsed.pillar, goal.goal, userMessage);
        botResponse += '\n\n' + messages.blockerLogged(parsed.pillar, userMessage.substring(0, 100));
      }
    } else if (parsed.hasBlocker) {
      // Blocker but no clear pillar
      botResponse = `📌 It sounds like you're running into something tough. Can you tell me which area it's related to? For example:\n\n"I'm blocked on my fitness goal because..."`;
    } else {
      botResponse = messages.unknownMessage();
    }

    await bot.sendMessage(chatId, botResponse, { parse_mode: 'Markdown' });
    await logCheckIn(
      'text_message',
      userMessage,
      botResponse,
      goalUpdated,
      progressValue,
      parsed.hasBlocker,
      parsed.hasBlocker ? userMessage : null
    );

  } catch (err) {
    logger.error('Error handling text message', err.message);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Try again!');
  }
}

module.exports = { handleStart, handleHelp, handleGoals, handleMorning, handleEvening, handleTextMessage };
