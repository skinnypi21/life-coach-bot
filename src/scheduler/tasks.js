const { getCurrentWeekGoals, checkIfReviewDone } = require('../sheets/queries');
const { logCheckIn } = require('../sheets/queries');
const messages = require('../bot/messages');
const config = require('../config');
const logger = require('../utils/logger');

// Send a message to Peter's Telegram chat
async function sendMessage(bot, text) {
  try {
    await bot.sendMessage(config.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
    logger.info('Scheduled message sent');
  } catch (err) {
    logger.error('Failed to send scheduled message', err.message);
  }
}

// Morning check-in (9 AM daily)
async function runMorningCheckIn(bot) {
  logger.info('Running morning check-in');
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.morningCheckIn(goals);
    await sendMessage(bot, text);
    await logCheckIn('morning_scheduled', 'scheduled', text);
  } catch (err) {
    logger.error('Error in morning check-in', err.message);
  }
}

// Evening check-in (6 PM daily)
async function runEveningCheckIn(bot) {
  logger.info('Running evening check-in');
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.eveningCheckIn(goals);
    await sendMessage(bot, text);
    await logCheckIn('evening_scheduled', 'scheduled', text);
  } catch (err) {
    logger.error('Error in evening check-in', err.message);
  }
}

// Mid-week check-in (Wednesday 12 PM)
async function runMidWeekCheckIn(bot) {
  logger.info('Running mid-week check-in');
  try {
    const goals = await getCurrentWeekGoals();
    const text = messages.midWeekCheckIn(goals);
    await sendMessage(bot, text);
    await logCheckIn('midweek_scheduled', 'scheduled', text);
  } catch (err) {
    logger.error('Error in mid-week check-in', err.message);
  }
}

// Weekly review reminder (Sunday 7 PM)
async function runWeeklyReviewReminder(bot) {
  logger.info('Running weekly review reminder');
  try {
    const text = messages.weeklyReviewReminder(config.WEB_APP_URL);
    await sendMessage(bot, text);
    await logCheckIn('review_reminder_scheduled', 'scheduled', text);
  } catch (err) {
    logger.error('Error in weekly review reminder', err.message);
  }
}

// Monday nag if review not done (Monday 9 AM)
async function runMondayNag(bot) {
  logger.info('Checking if weekly review was done');
  try {
    const reviewDone = await checkIfReviewDone();
    if (!reviewDone) {
      logger.info('Review not done — sending nag');
      const text = messages.mondayNag(config.WEB_APP_URL);
      await sendMessage(bot, text);
      await logCheckIn('monday_nag_scheduled', 'scheduled', text);
    } else {
      logger.info('Review already done — skipping nag');
    }
  } catch (err) {
    logger.error('Error in Monday nag', err.message);
  }
}

module.exports = {
  runMorningCheckIn,
  runEveningCheckIn,
  runMidWeekCheckIn,
  runWeeklyReviewReminder,
  runMondayNag
};
