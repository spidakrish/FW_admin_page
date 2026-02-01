import rateLimit from "express-rate-limit";
import { config } from "../config";

/**
 * Global rate limiter for all API requests.
 * Configured via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.maxRequests,
  standardHeaders: "draft-7", // Combined RateLimit header per IETF draft-7
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    status: "error",
    code: "RATE_LIMITED",
    message: "Too many requests, please try again later"
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === "/api/v1/health",
  // Use request IP as the key
  keyGenerator: (req) => {
    // Trust X-Forwarded-For header when behind a proxy
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.ip ?? "unknown";
  }
});

/**
 * Stricter rate limiter for authentication-related endpoints.
 * More restrictive to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    status: "error",
    code: "AUTH_RATE_LIMITED",
    message: "Too many authentication attempts, please try again later"
  },
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.ip ?? "unknown";
  }
});
