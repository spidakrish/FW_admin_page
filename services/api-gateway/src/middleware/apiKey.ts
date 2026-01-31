import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

/**
 * Performs a timing-safe comparison of two strings.
 * Prevents timing attacks by ensuring comparison takes constant time.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time even when lengths differ
    const dummy = Buffer.from(a);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Validates the API key from the request header against configured keys.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function isValidApiKey(providedKey: string): boolean {
  return config.apiKeys.some((validKey) => timingSafeCompare(providedKey, validKey));
}

/**
 * Express middleware that guards routes with API key authentication.
 * Expects the API key in the 'x-fw-admin-key' header.
 */
export function apiKeyGuard(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-fw-admin-key"];

  if (!key || Array.isArray(key)) {
    return res.status(401).json({
      status: "error",
      code: "MISSING_API_KEY",
      message: "API key is required in x-fw-admin-key header"
    });
  }

  if (!isValidApiKey(key)) {
    return res.status(401).json({
      status: "error",
      code: "INVALID_API_KEY",
      message: "Invalid API key"
    });
  }

  return next();
}
