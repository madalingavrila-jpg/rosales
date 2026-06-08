import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentConfig, SalesTeam } from "./types.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnv({ path: path.join(rootDir, ".env") });
loadEnv({ path: path.join(rootDir, ".env.local"), override: true });

function parseAgentsJson(raw: string | undefined): AgentConfig[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as AgentConfig[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        typeof a.email === "string" &&
        typeof a.password === "string",
    );
  } catch {
    return [];
  }
}

/** Monthly activation targets per rep (hardcoded until SF provides team KPIs). */
export const DENSITY_TARGET_PER_REP = 25;
export const COMPLEX_TARGET_PER_REP = 8;

/**
 * Rep → team mapping. Salesforce has no rep-level Density/Complex field;
 * Opportunity.Complex_Leads__c is per-deal and sparse. Classification rules:
 * - aceolution.com outsourced hunters → density
 * - bolt.eu high-volume outbound hunters → density
 * - bolt.eu closers / mid-market reps → complex
 * Override via ROSALES_REP_TEAMS_JSON env: {"email@bolt.eu":"density",...}
 */
const DEFAULT_REP_TEAMS: Record<string, SalesTeam> = {
  // Density — outsourced + high-volume SMB hunters
  "petru.avornicesei@aceolution.com": "density",
  "bogdan.nerpii@aceolution.com": "density",
  "razvan.save@aceolution.com": "density",
  "nikolai.podvolotski@bolt.eu": "density",
  "alexandra.laes@bolt.eu": "density",
  "cezar.voicu@bolt.eu": "density",
  "elena.popa@bolt.eu": "density",
  "ionut.toader@bolt.eu": "density",
  // Complex — core closers / mid-market
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

function parseRepTeamsJson(raw: string | undefined): Record<string, SalesTeam> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, SalesTeam> = {};
    for (const [email, team] of Object.entries(parsed)) {
      if (team === "density" || team === "complex") {
        out[email.toLowerCase()] = team;
      }
    }
    return out;
  } catch {
    return {};
  }
}

const repTeamOverrides = parseRepTeamsJson(process.env.ROSALES_REP_TEAMS_JSON);

export function resolveRepTeam(email: string): SalesTeam | null {
  const key = email.toLowerCase();
  if (repTeamOverrides[key]) return repTeamOverrides[key];
  if (DEFAULT_REP_TEAMS[key]) return DEFAULT_REP_TEAMS[key];
  if (key.endsWith("@aceolution.com")) return "density";
  return null;
}

export const config = {
  rootDir,
  publicDir: path.join(rootDir, "public"),
  cachePath:
    process.env.ROSALES_CACHE_PATH?.trim() ||
    path.join(rootDir, "data", "cache.json"),
  port: parseInt(process.env.PORT || "8080", 10),
  host: process.env.HOST || "0.0.0.0",
  sessionSecret:
    process.env.SESSION_SECRET || "rosales-dev-session-secret-change-me",
  leaderPassword: process.env.ROSALES_LEADER_PASSWORD || "leader-dev-password",
  agents: parseAgentsJson(process.env.ROSALES_AGENTS_JSON),
  sheetId: process.env.ROSALES_SHEET_ID?.trim() || "",
  isProduction: process.env.NODE_ENV === "production",
};

export function ensureCacheDir(): void {
  const dir = path.dirname(config.cachePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
