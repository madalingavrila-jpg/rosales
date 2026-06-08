import compression from "compression";
import cookieSession from "cookie-session";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { config, ensureCacheDir } from "./config.js";
import { requireAuthPage } from "./middleware/requireAuth.js";
import { apiRouter } from "./routes/api.js";

ensureCacheDir();

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(compression({ threshold: 1024 }));
app.use(express.json());

app.use(
  cookieSession({
    name: "rosales_session",
    keys: [config.sessionSecret],
    maxAge: 12 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.redirect("/login.html");
});

app.get(
  "/dashboard.html",
  requireAuthPage,
  (_req, res) => {
    res.sendFile(path.join(config.publicDir, "dashboard.html"));
  },
);

app.use(
  express.static(config.publicDir, {
    index: false,
    maxAge: config.isProduction ? "1h" : 0,
  }),
);

app.listen(config.port, config.host, () => {
  console.log(
    `rosales listening on http://${config.host}:${config.port}`,
  );
});
