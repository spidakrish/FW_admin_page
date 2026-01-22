import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function apiKeyGuard(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-fw-admin-key"];

  if (!key || Array.isArray(key) || !config.apiKeys.includes(key)) {
    return res.status(401).json({ status: "unauthorized" });
  }

  return next();
}
