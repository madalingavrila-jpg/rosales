# MCP refresh flow — Rosales

Rosales does **not** auto-sync. Data is refreshed on user prompt (e.g. *"sync rosales"*, *"refresh rosales dashboard"*) via Cursor agent + MCP tools.

## Data flow

```
Salesforce MCP ──┐
                 ├──► build-cache-from-export.mjs ──► data/cache.json ──► /api/data
Looker MCP ──────┘              │
                                  └──► bolt-pint MCP ──► Google Sheet (cache layer)
```

The Google Sheet is the **sync/cache layer** for auditing and optional live reads. The app serves from `data/cache.json` committed or written at deploy time.

## Step 1 — Pull Salesforce aggregates

Use **user-Salesforce** MCP `soqlQuery`:

| Export file | SOQL |
|---|---|
| `data/mcp-exports/sf-stages.json` | `SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE CloseDate = THIS_MONTH GROUP BY StageName LIMIT 50` |
| `data/mcp-exports/sf-reps-month.json` | `SELECT Owner.Name Name, Owner.Email Email, COUNT(Id) cnt FROM Opportunity WHERE CloseDate = THIS_MONTH GROUP BY Owner.Name, Owner.Email ORDER BY COUNT(Id) DESC LIMIT 100` |
| `data/mcp-exports/sf-reps-outcomes.json` | `SELECT Owner.Email Email, Owner.Name Name, StageName, COUNT(Id) cnt FROM Opportunity WHERE CloseDate = THIS_MONTH AND StageName IN ('Closed Won','Closed Lost','Activated') GROUP BY Owner.Email, Owner.Name, StageName LIMIT 500` |
| `data/mcp-exports/sf-today.json` | `SELECT COUNT(Id) total FROM Opportunity WHERE CloseDate = TODAY` |

Save each MCP response JSON to the paths above.

## Step 2 — Optional Looker daily trend

Use **user-looker-mcp** `looker-query` when a food/delivery sales explore is confirmed. Example placeholder (adjust model/explore/fields with team):

```json
{
  "model": "curated",
  "explore": "fact_order_delivery",
  "fields": ["fact_order_delivery.created_date", "fact_order_delivery.count"],
  "filters": { "dim_country.country_name": "Romania" },
  "limit": 14
}
```

Map results to `data/mcp-exports/looker-daily.json`:

```json
[
  { "date": "2026-06-01", "closedWon": 0, "closedLost": 0, "newOpportunities": 120 }
]
```

If Looker is skipped, the dashboard keeps the previous daily trend or seed values.

## Step 3 — Build local cache

```bash
cd rosales
node scripts/build-cache-from-export.mjs
```

## Step 4 — Write Google Sheet (bolt-pint)

1. Set `ROSALES_SHEET_ID` in Boltable Secrets / `.env.local`.
2. Generate sheet rows:

```bash
node scripts/build-cache-from-export.mjs --write-sheet-format > /tmp/rosales-sheet-rows.json
```

3. Use **user-bolt-pint** MCP `modify_sheet_values`:

- `spreadsheet_id`: your Sheet ID
- `range_name`: `Cache!A1`
- `values`: 2D array from step 2 (or clear + rewrite in chunks)

4. Optionally verify with `read_sheet_values` on `Cache!A1:Z500`.

## Step 5 — Deploy cache

Commit `data/cache.json` (or copy to Boltable persistent path if using live sheet read later).

Verify locally:

```bash
npm run dev
curl -s -c /tmp/c.jar -X POST http://localhost:8080/api/login -H 'Content-Type: application/json' -d '{"password":"leader-dev-password"}'
curl -s -b /tmp/c.jar http://localhost:8080/api/data | head -c 400
```

## Sheet tab layout (recommended)

| Tab | Purpose |
|---|---|
| `Cache` | Flat export from build script (audit) |
| `Overview` | KPI row for humans |
| `Reps` | Agent table |
| `Stages` | Stage funnel |
| `Daily` | 14-day trend |

Create tabs with bolt-pint `create_sheet` on first setup.
