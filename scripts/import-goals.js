/**
 * One-time script to import goals for week of 2/28/2026
 * Run: node scripts/import-goals.js
 */
require('dotenv').config();
const { getRows, appendRow } = require('../src/sheets/client');

const WEEK_ENDING = '2026-03-01'; // Next Sunday

const GOALS = {
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

async function main() {
  console.log('📋 Reading sheet headers...');
  const rows = await getRows('Weekly Goals & Scores', 'A1:BG1');
  const headers = rows[0] || [];
  console.log(`Found ${headers.length} columns`);

  // Check if a row for this week already exists
  const allRows = await getRows('Weekly Goals & Scores', 'A:B');
  const existing = allRows.slice(1).find(r => r[1] === WEEK_ENDING);
  if (existing) {
    console.log(`⚠️  Row for week ${WEEK_ENDING} already exists. Skipping.`);
    process.exit(0);
  }

  // Build row array matching the header columns
  const row = new Array(headers.length).fill('');

  const set = (key, value) => {
    const idx = headers.indexOf(key);
    if (idx !== -1) row[idx] = value;
    else console.warn(`⚠️  Header not found: ${key}`);
  };

  set('timestamp', new Date().toISOString());
  set('week_ending_date', WEEK_ENDING);

  for (const pillar of PILLARS) {
    set(`${pillar}_goal`, GOALS[pillar]);
    set(`${pillar}_score`, 0);
    set(`${pillar}_trackable`, 'FALSE');
    set(`${pillar}_target`, 1);
    set(`${pillar}_current`, 0);
  }

  console.log('\n🎯 Goals to import:');
  for (const pillar of PILLARS) {
    console.log(`  ${pillar}: ${GOALS[pillar]}`);
  }

  console.log('\n📝 Appending row to Weekly Goals & Scores...');
  await appendRow('Weekly Goals & Scores', row);
  console.log('✅ Goals imported successfully for week of 2026-03-01!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
