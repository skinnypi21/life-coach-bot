# Life Design v2 — PWA (`/app-v2`)

The installable PWA replacing Telegram + the v1 review form. Runs in parallel
with v1 until Telegram is manually decommissioned. **Phase 1 ships the app
shell**: PWA install flow, password auth, and the `/today` dashboard. Chat
(Phase 2), push (Phase 3), and review/trends (Phase 4) are placeholder tabs.

## Architecture

- **Frontend**: this app, deployed as its own Vercel project (root directory
  `app-v2`). Talks to the Railway backend over HTTPS with a bearer token.
- **Backend**: the existing Railway Express app, extended with an *additive*
  router at `/api/v2` (`src/v2/` at the repo root). v1 endpoints and all
  Telegram code paths are untouched.
- **Data**: Google Sheets remains canonical for all weekly data. No Postgres
  in Phase 1.

### v2 API (all under `/api/v2`, bearer-token protected except login)

| Endpoint | Purpose |
|---|---|
| `POST /login` | `{password}` → signed token (180-day expiry) |
| `GET /goals?weekEnding=` | Current week goals (same query as v1) |
| `POST /progress` | `{pillar, value, weekEnding}` — sets `{pillar}_current` to an **absolute** value |
| `GET /blockers` | Active blockers with sheet row numbers |
| `POST /blockers/resolve` | `{row, timestamp}` — verifies the row, sets `status=resolved` |

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
