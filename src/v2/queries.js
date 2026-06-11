// v2-only Sheets queries. These deliberately live outside src/sheets/queries.js
// so v1 code paths stay untouched. They reuse the low-level client only.
const { getRows, updateRow } = require('../sheets/client');

const SCORES_SHEET = 'Weekly Goals & Scores';
const BLOCKERS_SHEET = 'Blockers';

// 0-based column index -> spreadsheet column letter (A..Z, AA..)
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

// Set {pillar}_current to an ABSOLUTE value for the row matching weekEnding.
// weekEnding is client-computed (user's local timezone is authoritative — same
// decision as the v1 review form). Falls back to the most-recent-date row,
// mirroring getCurrentWeekGoals(), never blindly to the last array position.
async function updateProgressForWeek(pillar, value, weekEnding) {
  const rows = await getRows(SCORES_SHEET, 'A:BR');
  if (rows.length <= 1) throw new Error('No data rows in sheet');
  const headers = rows[0];

  const weekEndingIdx = headers.indexOf('week_ending_date');
  const currentIdx = headers.indexOf(`${pillar}_current`);
  if (currentIdx === -1) throw new Error(`Unknown pillar column: ${pillar}_current`);

  const dataRows = rows.slice(1);
  let rowIndex = weekEnding
    ? dataRows.findIndex(r => r[weekEndingIdx] === weekEnding)
    : -1;
  if (rowIndex === -1) {
    let bestDate = '';
    dataRows.forEach((r, i) => {
      const d = r[weekEndingIdx] || '';
      if (d > bestDate) { bestDate = d; rowIndex = i; }
    });
  }
  if (rowIndex === -1) throw new Error('No week row found');

  const sheetRow = rowIndex + 2; // +1 header, +1 one-indexed
  await updateRow(SCORES_SHEET, `${indexToCol(currentIdx)}${sheetRow}`, [value]);
  return { weekEnding: dataRows[rowIndex][weekEndingIdx] || null };
}

// Active blockers, each tagged with its 1-based sheet row number so the UI can
// resolve a specific row. Columns: A timestamp, B pillar, C goal,
// D blocker_description, E status, F resolution, G created_date.
async function getActiveBlockersDetailed() {
  const rows = await getRows(BLOCKERS_SHEET, 'A:G');
  const blockers = [];
  rows.slice(1).forEach((r, i) => {
    if ((r[4] || '') === 'active') {
      blockers.push({
        row: i + 2,
        timestamp: r[0] || '',
        pillar: r[1] || '',
        goal: r[2] || '',
        description: r[3] || ''
      });
    }
  });
  return blockers;
}

// Mark one blocker resolved. Re-reads the row and verifies the timestamp and
// active status first, so a stale client can't flip the wrong row if the
// sheet changed underneath it.
async function resolveBlocker(row, timestamp) {
  const rowNum = parseInt(row, 10);
  if (!Number.isInteger(rowNum) || rowNum < 2) throw new Error('Invalid blocker row');
  const rows = await getRows(BLOCKERS_SHEET, `A${rowNum}:G${rowNum}`);
  const r = rows[0];
  if (!r || (r[4] || '') !== 'active' || (r[0] || '') !== timestamp) {
    throw new Error('Blocker not found or already resolved — refresh and try again');
  }
  await updateRow(BLOCKERS_SHEET, `E${rowNum}:F${rowNum}`,
    ['resolved', new Date().toISOString()]);
}

module.exports = { updateProgressForWeek, getActiveBlockersDetailed, resolveBlocker };
