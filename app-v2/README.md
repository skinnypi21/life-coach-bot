# Life Design v2 — PWA (`/app-v2`)

The installable PWA replacing Telegram + the v1 review form. Runs in parallel
with v1 until Telegram is manually decommissioned. **Phase 1 ships the app
shell** (PWA install flow, password auth, `/today` dashboard) and **Phase 2
ships the AI coach chat** (`/chat`, Claude tool use + Postgres history). Push
(Phase 3) and review/trends (Phase 4) are placeholder tabs.

## Architecture

- **Frontend**: this app, deployed as its own Vercel project (root directory
  `app-v2`). Talks to the Railway backend over HTTPS with a bearer token.
- **Backend**: the existing Railway Express app, extended with an *additive*
  router at `/api/v2` (`src/v2/` at the repo root). v1 endpoints and all
  Telegram code paths are untouched.
- **Data**: Google Sheets remains canonical for all weekly data. Postgres
  (Railway, `DATABASE_URL`) holds chat history only — table `chat_messages`,
  created idempotently on first chat use or via `node src/v2/init-db.js`.

### v2 API (all under `/api/v2`, bearer-token protected except login)

| Endpoint | Purpose |
|---|---|
| `POST /login` | `{password}` → signed token (180-day expiry) |
| `GET /goals?weekEnding=` | Current week goals (same query as v1) |
| `POST /progress` | `{pillar, value, weekEnding}` — sets `{pillar}_current` to an **absolute** value |
| `GET /blockers` | Active blockers with sheet row numbers |
| `POST /blockers/resolve` | `{row, timestamp}` — verifies the row, sets `status=resolved` |
| `POST /chat` | `{message, weekEnding}` → `{reply, changes}` — Claude tool-use loop (max 5 rounds); `changes` is a structured list of progress/blocker writes for confirmation chips |
| `GET /chat/history?limit=` | Last N chat messages (default 50) from Postgres; the app reloads these on mount — chips re-render from `changes` stored in `tool_calls` jsonb |

### Chat behavior (Phase 2)

- Claude (model from `CLAUDE_MODEL`, default `claude-haiku-4-5`) gets the 11
  pillars, the **live** current-week goals, and today's date (America/New_York)
  in its system prompt on every request.
- Tools: `update_progress` (sets `{pillar}_current` to an **absolute** value —
  idempotent, fixes v1's additive double-counting), `log_blocker` (appends to
  the Blockers sheet), `get_goals`.
- Every exchange is also appended to the v1 "Daily Check-ins" sheet with type
  `app_chat`, so v1 and v2 history stay side by side during the parallel run.

### Conventions

- **weekEnding is client-computed** (the upcoming Sunday in the phone's local
  timezone) — same authoritative-client decision as the v1 review form.
- **Non-trackable goal status** is stored in `{pillar}_current` (schema
  unchanged): `0` = Not started, `1` = In progress, `2` = Done. v1 never reads
  `current` for non-trackable goals.
- Stepper writes are optimistic + debounced (450 ms); pending writes flush
  with `keepalive` fetches on `pagehide` so closing the app doesn't lose taps.

## Environment variables

| Where | Var | Value |
|---|---|---|
| Railway | `APP_PASSWORD` | login password |
| Railway | `AUTH_TOKEN_SECRET` | long random string, e.g. `openssl rand -hex 32` |
| Railway | `ANTHROPIC_API_KEY` | Claude API key (Phase 2 chat) |
| Railway | `CLAUDE_MODEL` | `claude-haiku-4-5` (swap for a Sonnet model for smarter coaching) |
| Railway | `DATABASE_URL` | Railway Postgres (chat history) |
| Vercel (this project) | `NEXT_PUBLIC_API_URL` | `https://life-coach-bot-production.up.railway.app` |

## Local development

```bash
# Terminal 1 — backend (repo root). Add APP_PASSWORD + AUTH_TOKEN_SECRET to .env first.
npm run dev   # Express on :3000

# Terminal 2 — this app
cd app-v2
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev   # Next.js on :3100
```

Icons are committed; regenerate after changing the mark with `npm run icons`.

## iOS install (16.4+ required for push later)

Web push on iOS only works for home-screen apps, so installing from Safari is
required — the app shows a first-run walkthrough until installed:

1. Open the Vercel URL in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Life Design** from the new home-screen icon (standalone, no browser chrome).
4. Log in once — the token persists.
5. (Phase 3) Grant notifications when prompted.
