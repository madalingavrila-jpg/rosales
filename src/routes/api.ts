import { Router } from "express";
import { authenticatePassword, isSessionUser } from "../auth.js";
import { getCacheStatus, loadDashboardModel } from "../data/cache.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { config } from "../config.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

apiRouter.get("/status", (_req, res) => {
  const cache = getCacheStatus();
  res.json({
    ok: true,
    app: "rosales",
    cache,
    sheetId: config.sheetId || null,
    agentCount: config.agents.length,
    dataFlow:
      "Salesforce + Looker (MCP refresh) → Google Sheet → data/cache.json → /api/data",
  });
});

apiRouter.get("/me", (req, res) => {
  const user = req.session?.user;
  if (!isSessionUser(user)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    role: user.role,
    name: user.name,
    email: user.email ?? null,
  });
});

apiRouter.post("/login", (req, res) => {
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";
  const user = authenticatePassword(password);
  if (!user) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  req.session!.user = user;
  res.json({
    ok: true,
    role: user.role,
    name: user.name,
    email: user.email ?? null,
  });
});

apiRouter.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

apiRouter.get("/data", requireAuth, (req, res) => {
  const user = req.session!.user!;
  const model = loadDashboardModel(user);
  res.setHeader("Cache-Control", "private, no-store");
  res.json(model);
});
