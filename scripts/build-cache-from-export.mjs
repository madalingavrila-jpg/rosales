#!/usr/bin/env node
/**
 * Builds data/cache.json from MCP export JSON files in data/mcp-exports/.
 *
 * Expected files (written by agent during MCP refresh):
 *   sf-stages.json      — Salesforce aggregate by StageName
 *   sf-reps-month.json  — Salesforce aggregate by Owner (month)
 *   sf-reps-outcomes.json — closed won/lost/activated by owner
 *   sf-today.json       — { total: N } opportunities today
 *   looker-daily.json   — optional Looker daily trend rows
 *
 * Usage:
 *   node scripts/build-cache-from-export.mjs
 *   node scripts/build-cache-from-export.mjs --write-sheet-format > /tmp/sheet-rows.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildActivationsKpi } from "./lib/activations.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = path.join(root, "data", "mcp-exports");
const cachePath = path.join(root, "data", "cache.json");
const writeSheetFormat = process.argv.includes("--write-sheet-format");

function readJson(name, fallback = null) {
  const p = path.join(exportDir, name);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sfRecords(data) {
  return data?.records ?? data ?? [];
}

function buildFromExports() {
  const stagesRaw = readJson("sf-stages.json", { records: [] });
  const repsMonthRaw = readJson("sf-reps-month.json", { records: [] });
  const repsOutcomesRaw = readJson("sf-reps-outcomes.json", { records: [] });
  const todayRaw = readJson("sf-today.json", { records: [{ total: 0 }] });
  const lookerDaily = readJson("looker-daily.json", []);

  const stageBreakdown = sfRecords(stagesRaw).map((r) => ({
    stage: r.StageName ?? r.stage ?? "Unknown",
    count: Number(r.cnt ?? r.count ?? 0),
  }));

  const repMap = new Map();

  for (const r of sfRecords(repsMonthRaw)) {
    const email = (r.Email ?? r.email ?? "").toLowerCase();
    const name = r.Name ?? r.name ?? email;
    if (!email) continue;
    repMap.set(email, {
      name,
      email,
      opportunitiesMonth: Number(r.cnt ?? r.count ?? 0),
      closedWon: 0,
      closedLost: 0,
      activated: 0,
    });
  }

  for (const r of sfRecords(repsOutcomesRaw)) {
    const email = (r.Email ?? r.email ?? "").toLowerCase();
    const name = r.Name ?? r.name ?? email;
    const stage = r.StageName ?? r.stage ?? "";
    if (!email) continue;
    const row = repMap.get(email) ?? {
      name,
      email,
      opportunitiesMonth: 0,
      closedWon: 0,
      closedLost: 0,
      activated: 0,
    };
    const cnt = Number(r.cnt ?? r.count ?? 0);
    if (stage === "Closed Won") row.closedWon += cnt;
    else if (stage === "Closed Lost") row.closedLost += cnt;
    else if (stage === "Activated") row.activated += cnt;
    repMap.set(email, row);
  }

  const repMetrics = [...repMap.values()]
    .map((r) => {
      const decided = r.closedWon + r.closedLost;
      return { ...r, winRate: decided > 0 ? r.closedWon / decided : 0 };
    })
    .sort((a, b) => b.opportunitiesMonth - a.opportunitiesMonth);

  const closedWonMonth = stageBreakdown
    .filter((s) => s.stage === "Closed Won")
    .reduce((n, s) => n + s.count, 0);
  const closedLostMonth = stageBreakdown
    .filter((s) => s.stage === "Closed Lost")
    .reduce((n, s) => n + s.count, 0);
  const activatedMonth = stageBreakdown
    .filter((s) => s.stage === "Activated")
    .reduce((n, s) => n + s.count, 0);
  const totalOpportunitiesMonth = stageBreakdown.reduce((n, s) => n + s.count, 0);
  const activePipeline = stageBreakdown
    .filter(
      (s) =>
        !["0. Not Working", "Closed Won", "Closed Lost"].includes(s.stage),
    )
    .reduce((n, s) => n + s.count, 0);

  const todayRec = sfRecords(todayRaw)[0];
  const opportunitiesToday = Number(todayRec?.total ?? 0);

  const dailyTrend = Array.isArray(lookerDaily) && lookerDaily.length
    ? lookerDaily
    : [];

  const sources = ["salesforce-mcp"];
  if (dailyTrend.length) sources.push("looker-mcp");

  return {
    syncedAt: new Date().toISOString(),
    sources,
    periodLabel: "Luna curentă (Salesforce Opportunity)",
    overview: {
      opportunitiesToday,
      closedWonMonth,
      closedLostMonth,
      activatedMonth,
      activePipeline,
      totalOpportunitiesMonth,
    },
    activationsKpi: buildActivationsKpi(repMetrics),
    stageBreakdown,
    repMetrics,
    dailyTrend,
  };
}

function toSheetRows(cache) {
  const rows = [];
  rows.push(["_meta", "syncedAt", cache.syncedAt]);
  rows.push(["_meta", "sources", cache.sources.join(", ")]);
  rows.push([]);
  rows.push(["overview", ...Object.keys(cache.overview)]);
  rows.push(["overview", ...Object.values(cache.overview)]);
  rows.push([]);
  rows.push(["activations", "totalActual", "totalTarget", "progressPct"]);
  rows.push([
    "activations",
    cache.activationsKpi.totalActual,
    cache.activationsKpi.totalTarget,
    cache.activationsKpi.progressPct,
  ]);
  for (const teamKey of ["density", "complex"]) {
    const t = cache.activationsKpi.teams[teamKey];
    rows.push(["activations_team", t.label, t.actual, t.target, t.progressPct]);
    for (const r of t.reps) {
      rows.push([
        "activations_rep",
        t.label,
        r.name,
        r.email,
        r.actual,
        r.target,
        r.progressPct,
      ]);
    }
  }
  rows.push([]);
  rows.push(["stages", "stage", "count"]);
  for (const s of cache.stageBreakdown) rows.push(["stages", s.stage, s.count]);
  rows.push([]);
  rows.push([
    "reps",
    "name",
    "email",
    "opportunitiesMonth",
    "closedWon",
    "closedLost",
    "activated",
    "winRate",
  ]);
  for (const r of cache.repMetrics) {
    rows.push([
      "reps",
      r.name,
      r.email,
      r.opportunitiesMonth,
      r.closedWon,
      r.closedLost,
      r.activated,
      r.winRate,
    ]);
  }
  rows.push([]);
  rows.push(["daily", "date", "closedWon", "closedLost", "newOpportunities"]);
  for (const d of cache.dailyTrend) {
    rows.push(["daily", d.date, d.closedWon, d.closedLost, d.newOpportunities]);
  }
  return rows;
}

const cache = buildFromExports();

if (!cache.stageBreakdown.length && !cache.repMetrics.length) {
  console.error(
    "No MCP exports found in data/mcp-exports/. Run MCP refresh first (see docs/MCP_REFRESH.md).",
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(cachePath), { recursive: true });
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
console.log(`Wrote ${cachePath}`);

if (writeSheetFormat) {
  console.log(JSON.stringify(toSheetRows(cache), null, 2));
}
