// v2 Postgres access — chat history only. Sheets stays canonical for all
// weekly goal/score data; Postgres holds what Sheets is bad at (conversation
// history, later push subscriptions). Pool and schema init are lazy so the
// server still boots if DATABASE_URL is unset (chat endpoints fail, v1 and
// the rest of v2 keep working).
const { Pool } = require('pg');

let pool = null;
let schemaReady = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  if (!pool) {
    const url = process.env.DATABASE_URL;
    // Railway's internal network and local dev speak plain TCP; the public
    // Railway proxy requires TLS with a chain pg can't verify.
    const plainTcp = /railway\.internal|localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: plainTcp ? false : { rejectUnauthorized: false },
      max: 5
    });
  }
  return pool;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          SERIAL PRIMARY KEY,
    role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content     TEXT NOT NULL,
    tool_calls  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

// Idempotent (CREATE TABLE IF NOT EXISTS), memoized per process; a failed
// attempt clears the memo so the next request retries.
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .catch(err => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

// Most recent `limit` messages in chronological order.
async function loadRecentMessages(limit = 20) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, role, content, tool_calls, created_at
       FROM chat_messages ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  return rows.reverse();
}

async function saveMessage(role, content, toolCalls = null) {
  await ensureSchema();
  await getPool().query(
    'INSERT INTO chat_messages (role, content, tool_calls) VALUES ($1, $2, $3)',
    [role, content, toolCalls ? JSON.stringify(toolCalls) : null]
  );
}

module.exports = { ensureSchema, loadRecentMessages, saveMessage };
