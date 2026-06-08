export const DENSITY_TARGET_PER_REP = 25;
export const COMPLEX_TARGET_PER_REP = 8;

/** Keep in sync with src/config.ts DEFAULT_REP_TEAMS */
const DEFAULT_REP_TEAMS = {
  "petru.avornicesei@aceolution.com": "density",
  "bogdan.nerpii@aceolution.com": "density",
  "razvan.save@aceolution.com": "density",
  "nikolai.podvolotski@bolt.eu": "density",
  "alexandra.laes@bolt.eu": "density",
  "cezar.voicu@bolt.eu": "density",
  "elena.popa@bolt.eu": "density",
  "ionut.toader@bolt.eu": "density",
  "ciprian.teodorescu@bolt.eu": "complex",
  "alexandru.boboc@bolt.eu": "complex",
  "silviu.voicu@bolt.eu": "complex",
  "corneliu.radu@bolt.eu": "complex",
  "daniel.toltica@bolt.eu": "complex",
  "eusebiu.hanganu@bolt.eu": "complex",
  "ana.preda@bolt.eu": "complex",
  "andrei.patru@bolt.eu": "complex",
  "georgian.borcaeas@bolt.eu": "complex",
  "madalin.gavrila@bolt.eu": "complex",
};

const TEAM_LABELS = { density: "Density", complex: "Complex" };

export function resolveRepTeam(email) {
  const key = email.toLowerCase();
  if (DEFAULT_REP_TEAMS[key]) return DEFAULT_REP_TEAMS[key];
  if (key.endsWith("@aceolution.com")) return "density";
  return null;
}

function targetForTeam(team) {
  return team === "density" ? DENSITY_TARGET_PER_REP : COMPLEX_TARGET_PER_REP;
}

function progressPct(actual, target) {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 1000) / 10;
}

function buildTeam(team, reps) {
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

export function buildActivationsKpi(repMetrics) {
  const byTeam = { density: [], complex: [] };

  for (const rep of repMetrics) {
    const team = resolveRepTeam(rep.email);
    if (!team) continue;
    const target = targetForTeam(team);
    const actual = rep.activated ?? 0;
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
