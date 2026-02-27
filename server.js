require('dotenv').config();
const express = require('express');
const { createBot, getBot } = require('./src/bot');
const { startScheduler } = require('./src/scheduler');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const app = express();
app.use(express.json());

// Health check endpoint (used by Railway to verify the app is running)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Life Coach Bot is running 🤖' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Telegram webhook endpoint
// Railway will call this URL when a user sends a message to the bot
app.post(`/webhook/${config.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  const bot = getBot();
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// API endpoint for the web app to get current goals
app.get('/api/goals', async (req, res) => {
  try {
    const { getCurrentWeekGoals } = require('./src/sheets/queries');
    const goals = await getCurrentWeekGoals();
    res.json({ success: true, goals });
  } catch (err) {
    logger.error('API /goals error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint for the web app to submit a weekly review
app.post('/api/review', async (req, res) => {
  try {
    const { appendRow } = require('./src/sheets/client');
    const { getCurrentWeekEndingDate } = require('./src/utils/date');
    const data = req.body;

    // Build the row for Weekly Goals & Scores
    const { getCurrentWeekGoals, PILLARS } = require('./src/sheets/queries');
    const goals = await getCurrentWeekGoals();

    if (!goals) {
      return res.status(404).json({ success: false, error: 'No goals found for this week' });
    }

    // For now, log the review data — full implementation handled by web app
    logger.info('Weekly review submitted', data);

    // Send confirmation to Telegram
    const bot = getBot();
    const weekEnding = getCurrentWeekEndingDate();
    await bot.sendMessage(
      config.TELEGRAM_CHAT_ID,
      `✅ *Weekly review submitted!* Great job reflecting on your week ending ${weekEnding}.\n\nSee you next week! 🚀`,
      { parse_mode: 'Markdown' }
    );

    res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    logger.error('API /review error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start the server
async function start() {
  try {
    // Create and init the bot
    const bot = createBot();

    // Set webhook in production
    if (process.env.NODE_ENV === 'production') {
      const webhookUrl = `${process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_URL}/webhook/${config.TELEGRAM_BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      logger.info('Webhook set to: ' + webhookUrl);
    }

    // Start cron scheduler
    startScheduler(bot);

    // Start Express server
    const port = config.PORT;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (err) {
    logger.error('Failed to start server', err.message);
    process.exit(1);
  }
}

start();
