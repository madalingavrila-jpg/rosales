# Rosales — Bolt Sales RO Dashboard

Sales performance dashboard for the Bolt RO sales team, hosted on [Boltable](https://portal.boltable.eu).

**Target URL:** https://rosales.boltable.eu

## Features (v0.1)

- Password auth — team leader (full access) vs individual agent (own data only)
- Tab 1: **Prezentare generală** — KPIs, stage funnel, daily trend, rep table
- Data from Salesforce (primary) + optional Looker, cached via Google Sheet
- Bolt brand UI — white background, `#00D26A` accent

## Quick start

```bash
npm install
npm run seed:cache
npm run dev
```

Open http://localhost:8080 — default leader password: `leader-dev-password` (see `.env.example`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with tsx |
| `npm run build` | Compile TypeScript |
| `npm start` | Production server |
| `npm run seed:cache` | Seed `data/cache.json` from Salesforce exploration |
| `npm run build:cache` | Build cache from `data/mcp-exports/` |

## Data refresh

See [docs/MCP_REFRESH.md](docs/MCP_REFRESH.md) and [AGENTS.md](AGENTS.md).

## Deploy

Push to `boltable/rosales` on GitHub — Paketo auto-builds and deploys. Configure secrets in Boltable portal.
