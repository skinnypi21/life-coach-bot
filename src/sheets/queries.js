const { appendRow, getRows, updateRow } = require('./client');
const { getCurrentWeekEndingDate } = require('../utils/date');
const logger = require('../utils/logger');

const PILLARS = [
  'social_life', 'physical_health', 'mental_health', 'meaningful_job',
  'hobbies', 'manifesto_life_design', 'intellectual_stimulation',
  'meaning_purpose', 'romantic_love', 'financial', 'trying_something_new'
];

// Get headers from sheet
async function getHeaders() {
  const rows = await getRows('Weekly Goals & Scores', 'A1:BG1');
  return rows[0] || [];
}

// Get current week's goals
async function getCurrentWeekGoals() {
  try {
    const headers = await getHeaders();
    const rows = await getRows('Weekly Goals & Scores', 'A:BG');
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

      goals.push({
        pillar,
        goal: currentRow[goalIdx] || 'No goal set',
        trackable: currentRow[trackableIdx] === 'TRUE' || currentRow[trackableIdx] === true,
        target: parseInt(currentRow[targetIdx]) || 1,
        current: parseInt(currentRow[currentIdx]) || 0,
        score: parseInt(currentRow[scoreIdx]) || 0
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
    const rows = await getRows('Weekly Goals & Scores', 'A:BG');
    if (rows.length <= 1) return false;

    const weekEnding = getCurrentWeekEndingDate();
    const weekEndingIdx = headers.indexOf('week_ending_date');
    const currentIdx = headers.indexOf(`${pillar}_current`);

    const dataRows = rows.slice(1);
    let rowIndex = dataRows.findIndex(row => row[weekEndingIdx] === weekEnding);
    if (rowIndex === -1) rowIndex = dataRows.length - 1;

    const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexed
    const col = String.fromCharCode(65 + currentIdx); // Convert index to column letter
    await updateRow('Weekly Goals & Scores', `${col}${sheetRow}`, [[newValue]]);
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

module.exports = {
  getCurrentWeekGoals, updateProgress, logCheckIn,
  logBlocker, getActiveBlockers, checkIfReviewDone, PILLARS
};
