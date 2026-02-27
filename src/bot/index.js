const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const logger = require('../utils/logger');
const { handleStart, handleHelp, handleGoals, handleMorning, handleEvening, handleTextMessage } = require('./handlers');

let bot;

function createBot() {
  if (bot) return bot;

  // Use webhook in production, polling in development
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production, webhook mode — Express handles the updates
    bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { webHook: true });
    logger.info('Bot created in webhook mode');
  } else {
    // In development, use polling
    bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
    logger.info('Bot created in polling mode');
  }

  registerHandlers(bot);
  return bot;
}

function registerHandlers(bot) {
  // Command handlers
  bot.onText(/\/start/, (msg) => {
    logger.info('Received /start command');
    handleStart(bot, msg.chat.id);
  });

  bot.onText(/\/help/, (msg) => {
    logger.info('Received /help command');
    handleHelp(bot, msg.chat.id);
  });

  bot.onText(/\/goals/, (msg) => {
    logger.info('Received /goals command');
    handleGoals(bot, msg.chat.id);
  });

  bot.onText(/\/morning/, (msg) => {
    logger.info('Received /morning command');
    handleMorning(bot, msg.chat.id);
  });

  bot.onText(/\/evening/, (msg) => {
    logger.info('Received /evening command');
    handleEvening(bot, msg.chat.id);
  });

  // Handle all other text messages (free-form NLP)
  bot.on('message', (msg) => {
    // Skip if it's a command
    if (msg.text && msg.text.startsWith('/')) return;
    // Skip non-text messages
    if (!msg.text) return;

    logger.info('Received text message', { text: msg.text.substring(0, 50) });
    handleTextMessage(bot, msg.chat.id, msg.text);
  });

  bot.on('polling_error', (err) => {
    logger.error('Polling error', err.message);
  });

  bot.on('webhook_error', (err) => {
    logger.error('Webhook error', err.message);
  });

  logger.info('Bot handlers registered');
}

function getBot() {
  if (!bot) return createBot();
  return bot;
}

module.exports = { createBot, getBot };
