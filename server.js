require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createBot, getBot } = require('./src/bot');
const { startScheduler } = require('./src/scheduler');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const app = express();
app.use(cors());
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
    const { saveWeeklyReview, createNextWeekRow } = require('./src/sheets/queries');
    const { getCurrentWeekEndingDate } = require('./src/utils/date');
    const { weekEnding: clientWeekEnding, scores, satisfaction, current, nextGoals,
            reflectionInsight, reflectionDifferent } = req.body;

    // Use the date the client computed (in the user's local timezone) — fall back to server date
    const weekEnding = clientWeekEnding || getCurrentWeekEndingDate();

    // 1. Save scores, progress, and satisfaction into the current week row
    await saveWeeklyReview(scores || {}, current || {}, satisfaction || {}, weekEnding);

    // 2. Create next week row if any goals were provided
    const hasNextGoals = nextGoals && Object.values(nextGoals).some(g => g && g.trim());
    let nextWeekEnding = null;
    if (hasNextGoals) {
      nextWeekEnding = await createNextWeekRow(nextGoals, weekEnding);
    }

    // 3. Send Telegram confirmation with reflections echoed back
    const bot = getBot();
    const lines = [
      `✅ *Weekly review saved!* Week ending ${weekEnding}.`,
      reflectionInsight   ? `\n💡 *Insight:* ${reflectionInsight}` : null,
      reflectionDifferent ? `🔄 *Next time:* ${reflectionDifferent}` : null,
      nextWeekEnding      ? `\n🎯 Next week's goals set for ${nextWeekEnding}!` : null,
    ].filter(Boolean);
    await bot.sendMessage(config.TELEGRAM_CHAT_ID, lines.join('\n'), { parse_mode: 'Markdown' });

    logger.info(`Review saved: week=${weekEnding}, nextWeek=${nextWeekEnding}`);
    res.json({ success: true, weekEnding, nextWeekEnding });
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
      // APP_URL must include https://, RAILWAY_PUBLIC_DOMAIN does not
      let domain = process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
      if (domain && !domain.startsWith('http')) domain = 'https://' + domain;
      if (domain) {
        const webhookUrl = `${domain}/webhook/${config.TELEGRAM_BOT_TOKEN}`;
        await bot.setWebHook(webhookUrl);
        logger.info('Webhook set to: ' + webhookUrl);
      } else {
        logger.warn('No APP_URL set — webhook not configured. Bot running without webhook.');
      }
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
