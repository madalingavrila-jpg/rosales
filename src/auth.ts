import type { AgentConfig, SessionUser } from "./types.js";
import { config } from "./config.js";

export function authenticatePassword(password: string): SessionUser | null {
  const trimmed = password.trim();
  if (!trimmed) return null;

  if (trimmed === config.leaderPassword) {
    return { role: "leader", name: "Team Leader" };
  }

  const agent = config.agents.find((a) => a.password === trimmed);
  if (agent) return agentToSession(agent);

  return null;
}

function agentToSession(agent: AgentConfig): SessionUser {
  return {
    role: "agent",
    agentId: agent.id,
    name: agent.name,
    email: agent.email.toLowerCase(),
  };
}

export function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const u = value as SessionUser;
  return (
    (u.role === "leader" || u.role === "agent") &&
    typeof u.name === "string" &&
    (u.role === "leader" || typeof u.email === "string")
  );
}
