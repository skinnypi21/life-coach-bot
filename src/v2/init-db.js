// One-off migration/init for the v2 chat tables:
//   node src/v2/init-db.js
// Safe to re-run (CREATE TABLE IF NOT EXISTS). The chat endpoint also runs
// this lazily on first use, so deploys don't depend on running it manually.
require('dotenv').config();
const { ensureSchema } = require('./db');

ensureSchema()
  .then(() => {
    console.log('✅ chat_messages table ready');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ init failed:', err.message);
    process.exit(1);
  });
