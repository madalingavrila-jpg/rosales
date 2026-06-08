import type { NextFunction, Request, Response } from "express";
import { isSessionUser } from "../auth.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = req.session?.user;
  if (!isSessionUser(user)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAuthPage(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.session?.user;
  if (!isSessionUser(user)) {
    res.redirect("/login.html");
    return;
  }
  next();
}
