import type { SessionUser } from "../types.js";

declare module "express-serve-static-core" {
  interface Request {
    session: {
      user?: SessionUser;
    } | null;
  }
}
