import fs from "node:fs";
import { config } from "../config.js";
import { buildActivationsKpi, filterActivationsKpi } from "./activations.js";
import type {
  ActivationsKpi,
  DashboardCache,
  DashboardModel,
  OverviewKpis,
  RepMetric,
  SessionUser,
  StageRow,
} from "../types.js";

const EMPTY_ACTIVATIONS: ActivationsKpi = buildActivationsKpi([]);

const EMPTY_OVERVIEW: OverviewKpis = {
  opportunitiesToday: 0,
  closedWonMonth: 0,
  closedLostMonth: 0,
  activatedMonth: 0,
  activePipeline: 0,
  totalOpportunitiesMonth: 0,
};

function readCacheFile(): DashboardCache | null {
  try {
    if (!fs.existsSync(config.cachePath)) return null;
    const raw = fs.readFileSync(config.cachePath, "utf8");
    const parsed = JSON.parse(raw) as DashboardCache;
    if (!parsed?.overview || !Array.isArray(parsed.repMetrics)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function filterRepMetrics(
  reps: RepMetric[],
  user: SessionUser,
): RepMetric[] {
  if (user.role === "leader") return reps;
  const email = user.email?.toLowerCase();
  if (!email) return [];
  return reps.filter((r) => r.email.toLowerCase() === email);
}

function aggregateOverviewForAgent(
  reps: RepMetric[],
  base: OverviewKpis,
): OverviewKpis {
  if (reps.length === 0) return { ...EMPTY_OVERVIEW };
  const closedWonMonth = reps.reduce((s, r) => s + r.closedWon, 0);
  const closedLostMonth = reps.reduce((s, r) => s + r.closedLost, 0);
  const activatedMonth = reps.reduce((s, r) => s + r.activated, 0);
  const opportunitiesMonth = reps.reduce((s, r) => s + r.opportunitiesMonth, 0);
  const activePipeline = Math.max(
    0,
    opportunitiesMonth - closedWonMonth - closedLostMonth,
  );
  return {
    opportunitiesToday: Math.max(1, Math.round(opportunitiesMonth / 30)),
    closedWonMonth,
    closedLostMonth,
    activatedMonth,
    activePipeline,
    totalOpportunitiesMonth: opportunitiesMonth,
  };
}

function filterStagesForAgent(
  stages: StageRow[],
  reps: RepMetric[],
  user: SessionUser,
): StageRow[] {
  if (user.role === "leader") return stages;
  if (reps.length === 0) return [];
  const rep = reps[0];
  return [
    { stage: "Closed Won", count: rep.closedWon },
    { stage: "Closed Lost", count: rep.closedLost },
    { stage: "Activated", count: rep.activated },
    {
      stage: "Pipeline",
      count: Math.max(
        0,
        rep.opportunitiesMonth - rep.closedWon - rep.closedLost - rep.activated,
      ),
    },
  ].filter((s) => s.count > 0);
}

export function loadDashboardModel(user: SessionUser): DashboardModel {
  const cache = readCacheFile();
  const syncedAt = cache?.syncedAt ?? new Date().toISOString();
  const sources = cache?.sources ?? ["seed"];
  const periodLabel = cache?.periodLabel ?? "Luna curentă";

  const allReps = cache?.repMetrics ?? [];
  const repMetrics = filterRepMetrics(allReps, user);
  const activationsBase =
    cache?.activationsKpi ?? buildActivationsKpi(allReps);
  const activationsKpi =
    user.role === "leader"
      ? activationsBase
      : filterActivationsKpi(activationsBase, user.email);
  const overview =
    user.role === "leader"
      ? (cache?.overview ?? EMPTY_OVERVIEW)
      : aggregateOverviewForAgent(repMetrics, cache?.overview ?? EMPTY_OVERVIEW);

  const stageBreakdown = filterStagesForAgent(
    cache?.stageBreakdown ?? [],
    repMetrics,
    user,
  );

  let dailyTrend = cache?.dailyTrend ?? [];
  if (user.role === "agent" && repMetrics.length > 0) {
    const factor =
      (cache?.overview?.totalOpportunitiesMonth ?? 1) > 0
        ? repMetrics[0].opportunitiesMonth /
          (cache?.overview?.totalOpportunitiesMonth ?? 1)
        : 0;
    dailyTrend = dailyTrend.map((d) => ({
      date: d.date,
      closedWon: Math.round(d.closedWon * factor),
      closedLost: Math.round(d.closedLost * factor),
      newOpportunities: Math.round(d.newOpportunities * factor),
    }));
  }

  return {
    meta: {
      syncedAt,
      sources,
      periodLabel,
      role: user.role,
      agentEmail: user.email,
    },
    overview,
    activationsKpi,
    stageBreakdown,
    repMetrics,
    dailyTrend,
  };
}

export { buildActivationsKpi };

export function getCacheStatus(): {
  ok: boolean;
  cachePath: string;
  exists: boolean;
  syncedAt: string | null;
  repCount: number;
} {
  const cache = readCacheFile();
  return {
    ok: Boolean(cache),
    cachePath: config.cachePath,
    exists: fs.existsSync(config.cachePath),
    syncedAt: cache?.syncedAt ?? null,
    repCount: cache?.repMetrics?.length ?? 0,
  };
}

export function writeCache(data: DashboardCache): void {
  fs.writeFileSync(config.cachePath, JSON.stringify(data, null, 2), "utf8");
}
