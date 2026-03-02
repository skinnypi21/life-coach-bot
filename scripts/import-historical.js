/**
 * Historical data import from Life Planner spreadsheet
 *
 * Phase A (4/21/2025 – 11/9/2025): "Taking Control" tab
 *   - Cell text = goal, cell background color = achievement score (red=1, dark green=10, gray=N/A)
 *   - Column A = Monday (week start) → convert to Sunday (week_ending_date)
 *
 * Phase B (11/16/2025 – 2/22/2026): "Form Responses 1" tab
 *   - 4 columns per pillar: goal_this_week, progress(1-5), satisfaction(1-5), goal_next_week
 *   - Column B = Sunday date (week_ending_date)
 *
 * Run: node scripts/import-historical.js
 */
require('dotenv').config();
const { getRows, getRowsFrom, getCellFormats, appendRow, updateRow, ensureColumns } = require('../src/sheets/client');
const { detectTrackable } = require('../src/bot/parser');

const LIFE_PLANNER_ID = '1qq-H6rQDSmrRwYgcFipKegTkpnNgpRjw8s2yxC7wvWo';

const PILLARS = [
  'social_life', 'physical_health', 'mental_health', 'meaningful_job',
  'hobbies', 'manifesto_life_design', 'intellectual_stimulation',
  'meaning_purpose', 'romantic_love', 'financial', 'trying_something_new'
];

const SATISFACTION_HEADERS = PILLARS.map(p => `${p}_satisfaction`);

// Convert a cell background color ({red,green,blue} as 0-1 floats) to a 1-10 score.
// Returns null for white/gray cells (N/A).
function colorToScore(bgColor) {
  if (!bgColor) return null;
  const red = bgColor.red || 0;
  const green = bgColor.green || 0;
  const blue = bgColor.blue || 0;

  // Near-white: all channels high → unset/N/A
  if (red > 0.95 && green > 0.95 && blue > 0.95) return null;

  // Gray: channels roughly equal and mid-range → N/A
  const avg = (red + green + blue) / 3;
  const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
  if (spread < 0.2 && avg > 0.55 && avg < 0.85) return null; // mid-gray
  if (spread < 0.15) return null; // very low saturation = gray-ish

  // Map green vs red dominance to 1–10
  // green=1, red=0 → score=10; green=0, red=1 → score=1
  const ratio = (green - red + 1) / 2; // 0–1 range
  const score = Math.round(1 + 9 * ratio);
  return Math.max(1, Math.min(10, score));
}

// Convert a Google Sheets date serial number to a JS Date (UTC)
// Google Sheets epoch: Dec 30, 1899 (accounting for the 1900 leap year bug)
function serialToDate(serial) {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
}

// Given a Taking Control date cell { value, rawValue }, return the Sunday (week_ending_date)
// Column A stores Monday dates; add 6 days to get Sunday
function mondayToSunday(dateCell) {
  let d;
  if (dateCell.rawValue && dateCell.rawValue.numberValue) {
    // Date stored as serial number (most reliable)
    d = serialToDate(dateCell.rawValue.numberValue);
  } else if (dateCell.value) {
    // Fall back to formatted string: may be "M/D" or "M/D/YYYY"
    const str = /^\d+\/\d+$/.test(dateCell.value)
      ? `${dateCell.value}/2025`  // append year for M/D format
      : dateCell.value;
    d = new Date(str);
  }
  if (!d || isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Parse "M/D/YYYY" date strings to YYYY-MM-DD (timezone-safe)
function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const [, m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Fall back for other formats
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// Parse "5 - Excellent progress" → 5, or plain "4" → 4
function parseRating(ratingStr) {
  if (!ratingStr) return null;
  if (ratingStr === 'N/A - Not applicable') return null;
  const m = String(ratingStr).match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Convert column index (0-based) to spreadsheet column letter (A, B, ..., Z, AA, AB, ...)
function colLetter(idx) {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

async function ensureSatisfactionHeaders(headers) {
  const missing = SATISFACTION_HEADERS.filter(h => !headers.includes(h));
  if (missing.length === 0) {
    console.log('✅ Satisfaction headers already present');
    return headers;
  }

  const startCol = colLetter(headers.length);
  const endCol = colLetter(headers.length + missing.length - 1);
  const neededCols = headers.length + missing.length;
  console.log(`📝 Adding ${missing.length} satisfaction columns (${startCol}1:${endCol}1)...`);
  // Extend the sheet grid if needed, then write headers
  await ensureColumns('Weekly Goals & Scores', neededCols);
  // updateRow wraps values in [values], so pass missing directly (not [missing])
  await updateRow('Weekly Goals & Scores', `${startCol}1:${endCol}1`, missing);
  return [...headers, ...missing];
}

async function getExistingWeeks(headers) {
  const rows = await getRows('Weekly Goals & Scores', 'A:BR');
  const weekIdx = headers.indexOf('week_ending_date');
  const existing = new Set();
  rows.slice(1).forEach(r => {
    if (r[weekIdx]) existing.add(r[weekIdx]);
  });
  return existing;
}

async function importPhaseA(headers, existingWeeks) {
  console.log('\n📂 Phase A: Taking Control tab (color-coded scores)...');

  const cellData = await getCellFormats(LIFE_PLANNER_ID, 'Taking Control', 'A1:L100');
  if (!cellData || cellData.length === 0) {
    console.log('  ⚠️  No data found in Taking Control tab');
    return 0;
  }

  // Skip header row (index 0)
  const dataRows = cellData.slice(1);
  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const dateCell = row[0];
    if (!dateCell || (!dateCell.value && !dateCell.rawValue)) continue; // empty row

    const weekEnding = mondayToSunday(dateCell);
    if (!weekEnding) continue;

    // Skip dates that are clearly invalid (before 2024)
    if (weekEnding < '2024-01-01') {
      console.log(`  ⚠️  ${weekEnding}: invalid date, skipping`);
      continue;
    }

    // Phase A only covers weeks before Form Responses start (11/16/2025)
    if (weekEnding >= '2025-11-16') {
      skipped++;
      continue;
    }

    if (existingWeeks.has(weekEnding)) {
      console.log(`  ─  ${weekEnding}: already exists, skipping`);
      continue;
    }

    // Build the row for the bot's sheet
    const newRow = new Array(headers.length).fill('');
    const set = (key, val) => {
      const idx = headers.indexOf(key);
      if (idx !== -1) newRow[idx] = val;
    };

    set('timestamp', new Date().toISOString());
    set('week_ending_date', weekEnding);

    // Columns B-L (indices 1-11) = pillars
    for (let i = 0; i < PILLARS.length; i++) {
      const cell = row[i + 1] || { value: '', bgColor: null };
      const goal = cell.value || '';
      const score = colorToScore(cell.bgColor);
      const { trackable, target } = detectTrackable(goal);

      const pillar = PILLARS[i];
      set(`${pillar}_goal`, goal);
      set(`${pillar}_score`, score !== null ? score : '');
      set(`${pillar}_trackable`, trackable ? 'TRUE' : 'FALSE');
      set(`${pillar}_target`, target);
      set(`${pillar}_current`, 0);
    }

    await appendRow('Weekly Goals & Scores', newRow);
    existingWeeks.add(weekEnding);
    imported++;
    console.log(`  ✅ ${weekEnding}: imported`);
  }

  console.log(`  Phase A complete: ${imported} imported, ${skipped} skipped (>= 11/16/2025)`);
  return imported;
}

async function importPhaseB(headers, existingWeeks) {
  console.log('\n📂 Phase B: Form Responses 1 tab (dual scores)...');

  const rows = await getRowsFrom(LIFE_PLANNER_ID, 'Form Responses 1', 'A2:AT50');
  if (!rows || rows.length === 0) {
    console.log('  ⚠️  No data found in Form Responses 1 tab');
    return 0;
  }

  let imported = 0;

  for (const row of rows) {
    const rawDate = row[1]; // Column B = week date
    if (!rawDate) continue;

    const weekEnding = parseDateToISO(rawDate);
    if (!weekEnding) continue;

    // Skip the current week (already imported via import-goals.js)
    if (weekEnding === '2026-03-01') {
      console.log(`  ─  ${weekEnding}: current week already imported, skipping`);
      continue;
    }

    if (existingWeeks.has(weekEnding)) {
      console.log(`  ─  ${weekEnding}: already exists, skipping`);
      continue;
    }

    const newRow = new Array(headers.length).fill('');
    const set = (key, val) => {
      const idx = headers.indexOf(key);
      if (idx !== -1) newRow[idx] = val;
    };

    set('timestamp', new Date().toISOString());
    set('week_ending_date', weekEnding);

    // Per pillar: 4 columns starting at index 2 (col C), stepping by 4
    // Layout: [goal_this_week, progress, satisfaction, goal_next_week]
    for (let i = 0; i < PILLARS.length; i++) {
      const base = 2 + i * 4; // 0-indexed
      const goal = row[base] || '';
      const progressRaw = row[base + 1] || '';
      const satisfactionRaw = row[base + 2] || '';

      const progressRating = parseRating(progressRaw);
      const satisfactionRating = parseRating(satisfactionRaw);

      // Convert 1-5 scale to 2-10 (×2)
      const score = progressRating !== null ? progressRating * 2 : '';
      const satisfaction = satisfactionRating !== null ? satisfactionRating * 2 : '';

      const { trackable, target } = detectTrackable(goal);
      const pillar = PILLARS[i];

      set(`${pillar}_goal`, goal);
      set(`${pillar}_score`, score);
      set(`${pillar}_trackable`, trackable ? 'TRUE' : 'FALSE');
      set(`${pillar}_target`, target);
      set(`${pillar}_current`, 0);
      set(`${pillar}_satisfaction`, satisfaction);
    }

    await appendRow('Weekly Goals & Scores', newRow);
    existingWeeks.add(weekEnding);
    imported++;
    console.log(`  ✅ ${weekEnding}: imported`);
  }

  console.log(`  Phase B complete: ${imported} imported`);
  return imported;
}

async function main() {
  console.log('🚀 Starting historical data import...\n');

  // Read current headers (including any satisfaction cols if they exist)
  let headers = await (async () => {
    const rows = await getRows('Weekly Goals & Scores', 'A1:BR1');
    return rows[0] || [];
  })();
  console.log(`📋 Bot sheet has ${headers.length} columns`);

  // Step 1: Ensure satisfaction columns exist in the header row
  headers = await ensureSatisfactionHeaders(headers);

  // Step 2: Load existing week dates to avoid duplicates
  const existingWeeks = await getExistingWeeks(headers);
  console.log(`📅 Found ${existingWeeks.size} existing week(s) in bot sheet`);

  // Step 3: Phase A — Taking Control tab
  const countA = await importPhaseA(headers, existingWeeks);

  // Step 4: Phase B — Form Responses 1 tab
  const countB = await importPhaseB(headers, existingWeeks);

  console.log(`\n🎉 Import complete! Total rows added: ${countA + countB}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
