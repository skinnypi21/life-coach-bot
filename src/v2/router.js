// v2 PWA API — everything here is new and additive. v1 endpoints
// (/api/goals, /api/review, Telegram webhook) are untouched.
const express = require('express');
const logger = require('../utils/logger');
const { createToken, verifyToken, safeEqual } = require('./auth');
const { getCurrentWeekGoals, PILLARS } = require('../sheets/queries');
const { updateProgressForWeek, getActiveBlockersDetailed, resolveBlocker } = require('./queries');
const { handleChat } = require('./chat');
const { loadRecentMessages } = require('./db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Tiny in-memory brute-force guard: max 10 failed logins per 15 minutes.
let loginFailures = [];
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

router.post('/login', (req, res) => {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!password || !secret) {
    return res.status(503).json({ success: false, error: 'Auth not configured (APP_PASSWORD / AUTH_TOKEN_SECRET missing)' });
  }

  const now = Date.now();
  loginFailures = loginFailures.filter(t => now - t < FAILURE_WINDOW_MS);
  if (loginFailures.length >= MAX_FAILURES) {
    return res.status(429).json({ success: false, error: 'Too many attempts — try again later' });
  }

  const attempt = (req.body && req.body.password) || '';
  if (!safeEqual(attempt, password)) {
    loginFailures.push(now);
    logger.warn('v2 login failed');
    return res.status(401).json({ success: false, error: 'Wrong password' });
  }

  res.json({ success: true, token: createToken(secret) });
});

function requireAuth(req, res, next) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, error: 'Auth not configured' });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !verifyToken(token, secret)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

// Current week goals (same query the v1 form uses, behind auth)
router.get('/goals', requireAuth, async (req, res) => {
  try {
    const goals = await getCurrentWeekGoals(req.query.weekEnding);
    res.json({ success: true, goals: goals || [] });
  } catch (err) {
    logger.error('API /v2/goals error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set {pillar}_current to an absolute value (stepper / status pill writes)
router.post('/progress', requireAuth, async (req, res) => {
  try {
    const { pillar, value, weekEnding } = req.body || {};
    if (!PILLARS.includes(pillar)) {
      return res.status(400).json({ success: false, error: `Unknown pillar: ${pillar}` });
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0 || num > 999) {
      return res.status(400).json({ success: false, error: 'value must be an integer 0–999' });
    }
    const result = await updateProgressForWeek(pillar, num, weekEnding);
    res.json({ success: true, pillar, value: num, weekEnding: result.weekEnding });
  } catch (err) {
    logger.error('API /v2/progress error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Blockers
// ---------------------------------------------------------------------------

router.get('/blockers', requireAuth, async (req, res) => {
  try {
    const blockers = await getActiveBlockersDetailed();
    res.json({ success: true, blockers });
  } catch (err) {
    logger.error('API /v2/blockers error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/blockers/resolve', requireAuth, async (req, res) => {
  try {
    const { row, timestamp } = req.body || {};
    await resolveBlocker(row, timestamp || '');
    res.json({ success: true });
  } catch (err) {
    logger.error('API /v2/blockers/resolve error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI coach chat (Phase 2)
// ---------------------------------------------------------------------------

// One user message in → assistant reply + structured list of progress/blocker
// changes (for confirmation chips). weekEnding is client-computed, same
// timezone decision as /progress and the v1 review form.
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, weekEnding } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message required' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ success: false, error: 'message too long (max 4000 chars)' });
    }
    const result = await handleChat(message.trim(), weekEnding);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('API /v2/chat error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Chat history for the app to reload on mount. `changes` is reconstructed
// from the tool_calls jsonb so confirmation chips survive a reload.
router.get('/chat/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const rows = await loadRecentMessages(limit);
    res.json({
      success: true,
      messages: rows.map(r => ({
        id: r.id,
        role: r.role,
        content: r.content,
        changes: (r.tool_calls && r.tool_calls.changes) || [],
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    logger.error('API /v2/chat/history error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
