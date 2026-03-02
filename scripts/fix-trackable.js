/**
 * One-time script to fix trackable flags for the week of 2026-03-01
 * Run: node scripts/fix-trackable.js
 */
require('dotenv').config();
const { getRows, updateRow } = require('../src/sheets/client');
const { detectTrackable } = require('../src/bot/parser');

const WEEK_ENDING = '2026-03-01';

const PILLARS = [
  'social_life', 'physical_health', 'mental_health', 'meaningful_job',
  'hobbies', 'manifesto_life_design', 'intellectual_stimulation',
  'meaning_purpose', 'romantic_love', 'financial', 'trying_something_new'
];

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

async function main() {
  console.log('📋 Reading sheet headers...');
  const rows = await getRows('Weekly Goals & Scores', 'A1:BR1');
  const headers = rows[0] || [];
  console.log(`Found ${headers.length} columns`);

  const allRows = await getRows('Weekly Goals & Scores', 'A:BR');
  const weekEndingIdx = headers.indexOf('week_ending_date');
  const dataRows = allRows.slice(1);
  const rowIndex = dataRows.findIndex(r => r[weekEndingIdx] === WEEK_ENDING);

  if (rowIndex === -1) {
    console.error(`❌ No row found for week ${WEEK_ENDING}`);
    process.exit(1);
  }

  const sheetRowNum = rowIndex + 2; // +1 header +1 one-indexed
  const currentRow = dataRows[rowIndex];
  console.log(`\nFound week ${WEEK_ENDING} at sheet row ${sheetRowNum}`);

  let fixCount = 0;
  for (const pillar of PILLARS) {
    const goalIdx = headers.indexOf(`${pillar}_goal`);
    const trackableIdx = headers.indexOf(`${pillar}_trackable`);
    const targetIdx = headers.indexOf(`${pillar}_target`);

    if (goalIdx === -1) continue;

    const goal = currentRow[goalIdx] || '';
    const { trackable, target } = detectTrackable(goal);
    const currentTrackable = currentRow[trackableIdx];
    const currentTarget = parseInt(currentRow[targetIdx]) || 1;

    const trackableStr = trackable ? 'TRUE' : 'FALSE';
    if (trackableStr !== currentTrackable || target !== currentTarget) {
      const trackableCol = colLetter(trackableIdx);
      const targetCol = colLetter(targetIdx);
      await updateRow('Weekly Goals & Scores', `${trackableCol}${sheetRowNum}`, [trackableStr]);
      await updateRow('Weekly Goals & Scores', `${targetCol}${sheetRowNum}`, [target]);
      console.log(`  ✅ ${pillar}: "${goal}" → trackable=${trackableStr}, target=${target}`);
      fixCount++;
    } else {
      console.log(`  ─  ${pillar}: no change (trackable=${currentTrackable}, target=${currentTarget})`);
    }
  }

  console.log(`\n✅ Done. Fixed ${fixCount} pillar(s) for week ${WEEK_ENDING}.`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
