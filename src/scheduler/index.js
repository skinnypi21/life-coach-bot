const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const {
  runMorningCheckIn,
  runEveningCheckIn,
  runMidWeekCheckIn,
  runWeeklyReviewReminder,
  runMondayNag
} = require('./tasks');

function startScheduler(bot) {
  const timezone = config.TIMEZONE; // 'America/New_York'

  // Morning check-in — every day at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    logger.info('Cron: morning check-in triggered');
    runMorningCheckIn(bot);
  }, { timezone });

  // Evening check-in — every day at 6:00 PM
  cron.schedule('0 18 * * *', () => {
    logger.info('Cron: evening check-in triggered');
    runEveningCheckIn(bot);
  }, { timezone });

  // Mid-week check-in — Wednesday at 12:00 PM
  cron.schedule('0 12 * * 3', () => {
    logger.info('Cron: mid-week check-in triggered');
    runMidWeekCheckIn(bot);
  }, { timezone });

  // Weekly review reminder — Sunday at 7:00 PM
  cron.schedule('0 19 * * 0', () => {
    logger.info('Cron: weekly review reminder triggered');
    runWeeklyReviewReminder(bot);
  }, { timezone });

  // Monday nag (if review not done) — Monday at 9:00 AM
  cron.schedule('0 9 * * 1', () => {
    logger.info('Cron: Monday nag triggered');
    runMondayNag(bot);
  }, { timezone });

  logger.info('Scheduler started with timezone: ' + timezone);
}

module.exports = { startScheduler };
