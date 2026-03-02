/**
 * Restore corrupted 2026-03-01 row data.
 * Reads current sheet state, prints diagnostics, and fixes any
 * cells where score="FALSE" or goal appears corrupted (single digit).
 * Run: node scripts/restore-current-week.js
 */
require('dotenv').config();
const { getRows, updateRow } = require('../src/sheets/client');

const WEEK_ENDING = '2026-03-01';

const CORRECT_GOALS = {
  social_life:               '4x socialize',
  physical_health:           'Workout 3x',
  mental_health:             'Meditate every single day',
  meaningful_job:            'Give the right amount of effort',
  hobbies:                   'Read 100 pages',
  manifesto_life_design:     'Life Design app MVP',
  intellectual_stimulation:  'Reconcile Dr. Hollis podcast notes for therapy',
  meaning_purpose:           'Volunteering training',
  romantic_love:             'Go on a date',
  financial:                 "Don't spend stupid money this weekend",
  trying_something_new:      'TBC',
};

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
  console.log('📋 Reading sheet headers and data...');
  const headerRows = await getRows('Weekly Goals & Scores', 'A1:BR1');
  const headers = headerRows[0] || [];
  console.log(`Found ${headers.length} columns`);

  const allRows = await getRows('Weekly Goals & Scores', 'A:BR');
  const weekEndingIdx = headers.indexOf('week_ending_date');
  const dataRows = allRows.slice(1);
  const rowIndex = dataRows.findIndex(r => r[weekEndingIdx] === WEEK_ENDING);

  if (rowIndex === -1) {
    console.error(`❌ No row found for week ${WEEK_ENDING}`);
    process.exit(1);
  }

  const sheetRowNum = rowIndex + 2; // +1 header, +1 one-indexed
  const currentRow = dataRows[rowIndex];
  console.log(`\nFound week ${WEEK_ENDING} at sheet row ${sheetRowNum}\n`);

  console.log('=== Current state ===');
  let fixCount = 0;
  for (const pillar of PILLARS) {
    const scoreIdx = headers.indexOf(`${pillar}_score`);
    const goalIdx  = headers.indexOf(`${pillar}_goal`);
    const score    = currentRow[scoreIdx];
    const goal     = currentRow[goalIdx];
    const correctGoal = CORRECT_GOALS[pillar];

    const scoreCorrupted = score === 'TRUE' || score === 'FALSE';
    const goalCorrupted  = goal !== correctGoal;

    console.log(`  ${pillar}:`);
    console.log(`    score: ${JSON.stringify(score)} ${scoreCorrupted ? '❌ CORRUPTED' : '✓'}`);
    console.log(`    goal:  ${JSON.stringify(goal)} ${goalCorrupted ? `❌ CORRUPTED (want: ${JSON.stringify(correctGoal)})` : '✓'}`);

    if (scoreCorrupted) {
      const col = colLetter(scoreIdx);
      await updateRow('Weekly Goals & Scores', `${col}${sheetRowNum}`, [0]);
      console.log(`    → Fixed score to 0`);
      fixCount++;
    }

    if (goalCorrupted) {
      const col = colLetter(goalIdx);
      await updateRow('Weekly Goals & Scores', `${col}${sheetRowNum}`, [correctGoal]);
      console.log(`    → Fixed goal to "${correctGoal}"`);
      fixCount++;
    }
  }

  console.log(`\n✅ Done. Applied ${fixCount} fix(es) to row ${sheetRowNum}.`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
