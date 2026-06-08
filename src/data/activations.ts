import {
  COMPLEX_TARGET_PER_REP,
  DENSITY_TARGET_PER_REP,
  resolveRepTeam,
} from "../config.js";
import type {
  ActivationsKpi,
  ActivationRep,
  RepMetric,
  SalesTeam,
  TeamActivations,
} from "../types.js";

const TEAM_LABELS: Record<SalesTeam, string> = {
  density: "Density",
  complex: "Complex",
};

function targetForTeam(team: SalesTeam): number {
  return team === "density" ? DENSITY_TARGET_PER_REP : COMPLEX_TARGET_PER_REP;
}

function progressPct(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 1000) / 10;
}

function buildTeam(
  team: SalesTeam,
  reps: ActivationRep[],
): TeamActivations {
  const actual = reps.reduce((sum, r) => sum + r.actual, 0);
  const target = reps.reduce((sum, r) => sum + r.target, 0);
  return {
    team,
    label: TEAM_LABELS[team],
    actual,
    target,
    progressPct: progressPct(actual, target),
    targetPerRep: targetForTeam(team),
    reps: reps.sort((a, b) => b.actual - a.actual || a.name.localeCompare(b.name)),
  };
}

/** Build activations KPI from rep metrics + optional per-email team overrides. */
export function buildActivationsKpi(repMetrics: RepMetric[]): ActivationsKpi {
  const byTeam: Record<SalesTeam, ActivationRep[]> = {
    density: [],
    complex: [],
  };

  for (const rep of repMetrics) {
    const team = resolveRepTeam(rep.email);
    if (!team) continue;

    const target = targetForTeam(team);
    const actual = rep.activated;
    byTeam[team].push({
      name: rep.name,
      email: rep.email,
      team,
      actual,
      target,
      progressPct: progressPct(actual, target),
    });
  }

  const density = buildTeam("density", byTeam.density);
  const complex = buildTeam("complex", byTeam.complex);
  const totalActual = density.actual + complex.actual;
  const totalTarget = density.target + complex.target;

  return {
    totalActual,
    totalTarget,
    progressPct: progressPct(totalActual, totalTarget),
    teams: { density, complex },
  };
}

export function filterActivationsKpi(
  kpi: ActivationsKpi,
  agentEmail: string | undefined,
): ActivationsKpi {
  if (!agentEmail) return kpi;
  const email = agentEmail.toLowerCase();

  const filterTeam = (team: TeamActivations): TeamActivations => {
    const reps = team.reps.filter((r) => r.email.toLowerCase() === email);
    return buildTeam(team.team, reps);
  };

  const density = filterTeam(kpi.teams.density);
  const complex = filterTeam(kpi.teams.complex);
  const totalActual = density.actual + complex.actual;
  const totalTarget = density.target + complex.target;

  return {
    totalActual,
    totalTarget,
    progressPct: progressPct(totalActual, totalTarget),
    teams: { density, complex },
  };
}
