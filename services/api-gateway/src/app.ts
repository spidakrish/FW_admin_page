/**
 * Express Application Factory
 *
 * This module creates and configures the Express application without starting
 * the server. This separation allows for:
 * - Testing with supertest (import app without side effects)
 * - Multiple instances if needed
 * - Clean separation of concerns
 *
 * The server startup logic remains in index.ts.
 */

import express from "express";
import cors from "cors";
import { config } from "./config";
import { httpLogger, requestIdHeader } from "./lib/logger";
import { securityHeaders, additionalSecurityHeaders } from "./middleware/security";
import { apiKeyGuard } from "./middleware/apiKey";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { fwAnalysisRouter } from "./routes/fwAnalysis";
import { backproRouter } from "./routes/backpro";
import { openApiRouter } from "./openapi/index";

/**
 * Creates and configures the Express application.
 *
 * @param options - Optional configuration overrides for testing
 * @returns Configured Express application
 */
export function createApp(options?: { skipRateLimiter?: boolean }) {
  const app = express();

  // ===========================================================================
  // SECURITY MIDDLEWARE
  // ===========================================================================

  app.use(securityHeaders);
  app.use(additionalSecurityHeaders);

  app.use(
    cors({
      origin: config.cors.origins.length > 0 ? config.cors.origins : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-fw-admin-key", "x-request-id"]
    })
  );

  // Rate limiting (can be skipped for certain tests)
  if (!options?.skipRateLimiter) {
    app.use(globalRateLimiter);
  }

  // ===========================================================================
  // REQUEST PARSING
  // ===========================================================================

  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  app.use(httpLogger);
  app.use(requestIdHeader);

  // ===========================================================================
  // HEALTH CHECK ENDPOINT (Public)
  // ===========================================================================

  app.get("/api/v1/health", (_req, res) => {
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0"
    });
  });

  // ===========================================================================
  // SERVICES STATUS ENDPOINT (Public)
  // ===========================================================================

  app.get("/api/v1/services/status", async (_req, res) => {
    const [fwAnalysis, backpro] = await Promise.all([
      checkServiceHealth("fw-analysis", config.services.fwAnalysis),
      checkServiceHealth("backpro", config.services.backpro)
    ]);

    const services = { fwAnalysis, backpro };
    const allHealthy = fwAnalysis.status === "healthy" && backpro.status === "healthy";

    return res.json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      gateway: {
        status: "healthy",
        version: process.env.npm_package_version ?? "0.1.0"
      },
      services
    });
  });

  // ===========================================================================
  // API DOCUMENTATION (Public)
  // ===========================================================================

  app.use("/docs", openApiRouter);

  // ===========================================================================
  // API ROUTES (Protected)
  // ===========================================================================

  app.use("/api/v1/fw-analysis", apiKeyGuard, fwAnalysisRouter);
  app.use("/api/v1/backpro", apiKeyGuard, backproRouter);

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Checks health of a single service with timeout.
 */
async function checkServiceHealth(
  name: string,
  url: string
): Promise<{ name: string; status: "healthy" | "unhealthy"; latencyMs: number }> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(new URL("/health", url), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return { name, status: "healthy", latencyMs };
    }
    return { name, status: "unhealthy", latencyMs };
  } catch {
    return { name, status: "unhealthy", latencyMs: Date.now() - startTime };
  }
}

// Export for convenience
export { config };
