# AGENTS.md — rosales

Bolt Sales RO dashboard on **Boltable** (`https://rosales.boltable.eu`).

## Stack

- **Runtime:** Node.js 22+ · Express 5 · TypeScript
- **Frontend:** static HTML/CSS/vanilla JS in `public/` (no bundler)
- **Auth:** `cookie-session` — leader password + per-agent passwords from env
- **Data:** `data/cache.json` served via `GET /api/data` with role-based filtering
- **Deploy:** Paketo Node buildpack — `npm run build` → `tsc`, `npm start` → port **8080**
- **No `project.toml`** — Node template (not nginx static)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Salesforce  │     │ Google Sheet │     │ data/cache.json │
│ + Looker    │────►│ (bolt-pint)  │────►│ (build script)  │
│ MCP refresh │     │ audit layer  │     └────────┬────────┘
└─────────────┘     └──────────────┘              │
                                                  ▼
                                         Express /api/data
                                         (leader = all, agent = filtered)
                                                  │
                                                  ▼
                                         public/dashboard.js
```

### Auth

| Role | Env | Access |
|---|---|---|
| Team leader | `ROSALES_LEADER_PASSWORD` | Full dashboard — all reps, all KPIs |
| Sales agent | `ROSALES_AGENTS_JSON` | Own row in rep table; KPIs derived from own metrics |

Session cookie: `rosales_session` (12h). Set `SESSION_SECRET` in Boltable Secrets for production.

### First tab — Prezentare generală

Built from **Salesforce Opportunity** aggregates (explored via MCP):

- **Activations KPI grid:** total team activations vs target; split by **Density** (25/rep) and **Complex** (8/rep) with per-agent progress bars. Team assignment is config-based (`src/config.ts` / `ROSALES_REP_TEAMS_JSON`) — SF has no rep-level Density/Complex field; activations = `StageName = 'Activated'`.
- **Secondary KPI cards:** opportunities today, closed won/lost month, activated, active pipeline, total
- **Stage breakdown:** horizontal bar chart (top 10 stages)
- **Daily trend:** 14-day won/lost bars (Looker optional; seed data until mapped)
- **Rep table:** opportunities, outcomes, win rate — filtered for agents

Other tabs (Pipeline, Conturi, Comision) are placeholders.

## MCP refresh (on user request only)

**Do not cron-sync.** When the user asks to refresh rosales:

1. Run Salesforce SOQL via **user-Salesforce** `soqlQuery` — save to `data/mcp-exports/` (see `docs/MCP_REFRESH.md`)
2. Optionally query **user-looker-mcp** `looker-query` for daily delivery metrics
3. `node scripts/build-cache-from-export.mjs`
4. **user-bolt-pint** `modify_sheet_values` → Sheet `ROSALES_SHEET_ID`
5. Report `syncedAt`, rep count, stage count

Phrase triggers: *"sync rosales"*, *"refresh rosales"*, *"actualizează rosales"*.

## Local dev

```bash
cd rosales
cp .env.example .env.local
npm install
npm run seed:cache
npm run dev
# http://localhost:8080 — leader: leader-dev-password
```

## Boltable deploy

### Prerequisites

1. NetBird VPN connected
2. GitHub org `boltable` access (`gh api user/orgs --jq '.[].login' | grep boltable`)
3. `gh auth login`

### Create repo & push

```bash
cd rosales
git init
git add .
git commit -m "Initial rosales sales dashboard"
gh repo create boltable/rosales --private --source=. --remote=origin --push
```

### Boltable Secrets (portal.boltable.eu)

| Secret | Required |
|---|---|
| `SESSION_SECRET` | Yes — random 32+ chars |
| `ROSALES_LEADER_PASSWORD` | Yes |
| `ROSALES_AGENTS_JSON` | Yes — `[{"id","name","email","password"},…]` |
| `ROSALES_SHEET_ID` | When Sheet sync is live |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional — future live Sheet read |

Live URL after push: **https://rosales.boltable.eu**

## Conventions

- Greenfield — **no foodro code or dependencies**
- Bolt green `#00D26A` in `public/css/tokens.css`
- Do not put passwords or secrets in `public/` or committed `.env`
- Agent filtering keys on **email** (must match Salesforce `Owner.Email`)

## Key files

| Path | Role |
|---|---|
| `src/server.ts` | Express app, static + API |
| `src/auth.ts` | Password → session user |
| `src/data/cache.ts` | Load/filter dashboard model |
| `scripts/build-cache-from-export.mjs` | MCP exports → cache.json |
| `docs/MCP_REFRESH.md` | Step-by-step MCP sync |
| `data/cache.json` | Runtime data snapshot |
