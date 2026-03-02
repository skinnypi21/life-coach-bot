const { appendRow, getRows, updateRow } = require('./client');
const { getCurrentWeekEndingDate } = require('../utils/date');
const { detectTrackable } = require('../bot/parser');
const logger = require('../utils/logger');

// Convert 0-based column index to spreadsheet column letter (A, B, ..., Z, AA, AB, ...)
function indexToCol(idx) {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

const PILLARS = [
  'social_life', 'physical_health', 'mental_health', 'meaningful_job',
  'hobbies', 'manifesto_life_design', 'intellectual_stimulation',
  'meaning_purpose', 'romantic_love', 'financial', 'trying_something_new'
];

// Get headers from sheet
async function getHeaders() {
  const rows = await getRows('Weekly Goals & Scores', 'A1:BR1');
  return rows[0] || [];
}

// Get current week's goals
async function getCurrentWeekGoals() {
  try {
    const headers = await getHeaders();
    const rows = await getRows('Weekly Goals & Scores', 'A:BR');
    if (rows.length <= 1) return null;

    const weekEnding = getCurrentWeekEndingDate();
    const weekEndingIdx = headers.indexOf('week_ending_date');

    // Find the row for current week
    const dataRows = rows.slice(1);
    let currentRow = dataRows.find(row => row[weekEndingIdx] === weekEnding);

    // Fall back to latest row if no exact match
    if (!currentRow) currentRow = dataRows[dataRows.length - 1];
    if (!currentRow) return null;

    const goals = [];
    for (const pillar of PILLARS) {
      const scoreIdx = headers.indexOf(`${pillar}_score`);
      const goalIdx = headers.indexOf(`${pillar}_goal`);
      const trackableIdx = headers.indexOf(`${pillar}_trackable`);
      const targetIdx = headers.indexOf(`${pillar}_target`);
      const currentIdx = headers.indexOf(`${pillar}_current`);

      const satisfactionIdx = headers.indexOf(`${pillar}_satisfaction`);

      goals.push({
        pillar,
        goal: currentRow[goalIdx] || 'No goal set',
        trackable: currentRow[trackableIdx] === 'TRUE' || currentRow[trackableIdx] === true,
        target: parseInt(currentRow[targetIdx]) || 1,
        current: parseInt(currentRow[currentIdx]) || 0,
        score: parseInt(currentRow[scoreIdx]) || 0,
        satisfaction: satisfactionIdx !== -1 ? (parseInt(currentRow[satisfactionIdx]) || 0) : 0
      });
    }
    return goals;
  } catch (err) {
    logger.error('Error getting current week goals', err.message);
    return null;
  }
}

// Update progress for a specific pillar
async function updateProgress(pillar, newValue) {
  try {
    const headers = await getHeaders();
    const rows = await getRows('Weekly Goals & Scores', 'A:BR');
    if (rows.length <= 1) return false;

    const weekEnding = getCurrentWeekEndingDate();
    const weekEndingIdx = headers.indexOf('week_ending_date');
    const currentIdx = headers.indexOf(`${pillar}_current`);

    const dataRows = rows.slice(1);
    let rowIndex = dataRows.findIndex(row => row[weekEndingIdx] === weekEnding);
    if (rowIndex === -1) rowIndex = dataRows.length - 1;

    const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexed
    const col = indexToCol(currentIdx);
    await updateRow('Weekly Goals & Scores', `${col}${sheetRow}`, [newValue]);
    return true;
  } catch (err) {
    logger.error('Error updating progress', err.message);
    return false;
  }
}

// Log a daily check-in
async function logCheckIn(type, userMessage, botResponse, goalUpdated = null, progressValue = null, blockerMentioned = false, blockerText = null) {
  try {
    await appendRow('Daily Check-ins', [
      new Date().toISOString(),
      type,
      userMessage,
      botResponse,
      goalUpdated || '',
      progressValue || '',
      blockerMentioned,
      blockerText || ''
    ]);
  } catch (err) {
    logger.error('Error logging check-in', err.message);
  }
}

// Log a blocker
async function logBlocker(pillar, goal, blockerDescription) {
  try {
    await appendRow('Blockers', [
      new Date().toISOString(),
      pillar,
      goal,
      blockerDescription,
      'active',
      '',
      new Date().toISOString()
    ]);
  } catch (err) {
    logger.error('Error logging blocker', err.message);
  }
}

// Get active blockers
async function getActiveBlockers() {
  try {
    const rows = await getRows('Blockers', 'A:G');
    if (rows.length <= 1) return [];
    return rows.slice(1).filter(row => row[4] === 'active');
  } catch (err) {
    logger.error('Error getting blockers', err.message);
    return [];
  }
}

// Check if this week's review has been done
async function checkIfReviewDone() {
  try {
    const rows = await getRows('Weekly Goals & Scores', 'A:B');
    if (rows.length <= 1) return false;
    const weekEnding = getCurrentWeekEndingDate();
    return rows.slice(1).some(row => row[1] === weekEnding);
  } catch (err) {
    return false;
  }
}

// Save review scores, progress, and satisfaction into the current week row
async function saveWeeklyReview(scores, current, satisfaction) {
  const headers = await getHeaders();
  const rows = await getRows('Weekly Goals & Scores', 'A:BR');
  if (!weekEnding) weekEnding = getCurrentWeekEndingDate();
  const weekEndingIdx = headers.indexOf('week_ending_date');

  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex(r => r[weekEndingIdx] === weekEnding);
  if (rowIndex === -1) throw new Error(`No row found for week ${weekEnding}`);

  const sheetRow = rowIndex + 2; // +1 header, +1 one-indexed
  const fullRow = dataRows[rowIndex].slice();
  while (fullRow.length < headers.length) fullRow.push('');

  for (const pillar of PILLARS) {
    const si = headers.indexOf(`${pillar}_score`);
    const ci = headers.indexOf(`${pillar}_current`);
    const xi = headers.indexOf(`${pillar}_satisfaction`);
    if (si !== -1 && scores[pillar] !== undefined)       fullRow[si] = scores[pillar];
    if (ci !== -1 && current[pillar] !== undefined)      fullRow[ci] = current[pillar];
    if (xi !== -1 && satisfaction[pillar] !== undefined) fullRow[xi] = satisfaction[pillar];
  }

  const endCol = indexToCol(headers.length - 1);
  await updateRow('Weekly Goals & Scores', `A${sheetRow}:${endCol}${sheetRow}`, fullRow);
}

// Append a new row for next week with the provided goals
async function createNextWeekRow(goals, weekEnding) {
  const headers = await getHeaders();
  if (!weekEnding) weekEnding = getCurrentWeekEndingDate();

  const nextDate = new Date(weekEnding + 'T12:00:00');
  nextDate.setDate(nextDate.getDate() + 7);
  const nextWeekEnding = nextDate.toISOString().split('T')[0];

  const existing = await getRows('Weekly Goals & Scores', 'A:B');
  if (existing.slice(1).some(r => r[1] === nextWeekEnding)) {
    throw new Error(`Row for ${nextWeekEnding} already exists`);
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i !== -1) row[i] = val; };

  set('timestamp', new Date().toISOString());
  set('week_ending_date', nextWeekEnding);

  for (const pillar of PILLARS) {
    const goal = goals[pillar] || '';
    const { trackable, target } = detectTrackable(goal);
    set(`${pillar}_goal`, goal);
    set(`${pillar}_score`, 0);
    set(`${pillar}_trackable`, trackable ? 'TRUE' : 'FALSE');
    set(`${pillar}_target`, target);
    set(`${pillar}_current`, 0);
  }

  await appendRow('Weekly Goals & Scores', row);
  return nextWeekEnding;
}

module.exports = {
  getCurrentWeekGoals, updateProgress, logCheckIn,
  logBlocker, getActiveBlockers, checkIfReviewDone,
  saveWeeklyReview, createNextWeekRow, PILLARS
};
