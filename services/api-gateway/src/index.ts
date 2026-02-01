import type { Server } from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { logger, httpLogger, requestIdHeader } from "./lib/logger";
import { securityHeaders, additionalSecurityHeaders } from "./middleware/security";
import { apiKeyGuard } from "./middleware/apiKey";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { fwAnalysisRouter } from "./routes/fwAnalysis";
import { backproRouter } from "./routes/backpro";
import { openApiRouter } from "./openapi/index";

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// CORS configuration - restrict origins in production
app.use(
  cors({
    origin: config.cors.origins.length > 0 ? config.cors.origins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-fw-admin-key", "x-request-id"]
  })
);

// Rate limiting - protect against DoS attacks
app.use(globalRateLimiter);

// =============================================================================
// REQUEST PARSING
// =============================================================================

// Parse JSON bodies with explicit size limit
app.use(express.json({ limit: config.bodyLimit }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// =============================================================================
// LOGGING
// =============================================================================

// Structured request logging with request ID correlation
app.use(httpLogger);

// Add request ID to response headers for client-side correlation
app.use(requestIdHeader);

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

// Public health check - does not expose internal service URLs
app.get("/api/v1/health", (_req, res) => {
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0"
  });
});

// =============================================================================
// SERVICES STATUS ENDPOINT (Public - for dashboard and monitoring)
// =============================================================================

/**
 * Checks health of a single service with timeout.
 * Returns status object with healthy/unhealthy state.
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

/**
 * Combined services status endpoint.
 * Public (no auth required) - used by dashboard and monitoring systems.
 * Returns aggregated health status of all backend services.
 */
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

// =============================================================================
// API DOCUMENTATION (Public)
// =============================================================================

// Serve OpenAPI documentation at /docs
// This route has relaxed CSP to allow Swagger UI to function
app.use("/docs", openApiRouter);

// =============================================================================
// API ROUTES
// =============================================================================

app.use("/api/v1/fw-analysis", apiKeyGuard, fwAnalysisRouter);
app.use("/api/v1/backpro", apiKeyGuard, backproRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// =============================================================================

let server: Server;

function startServer(): void {
  server = app.listen(config.port, () => {
    logger.info({
      msg: "API Gateway started",
      port: config.port,
      environment: config.isProduction ? "production" : "development"
    });
  });

  // Handle server errors
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.fatal({ msg: "Port already in use", port: config.port });
      process.exit(1);
    }
    throw error;
  });
}

function gracefulShutdown(signal: string): void {
  logger.info({ msg: "Graceful shutdown initiated", signal });

  // Stop accepting new connections
  server.close(() => {
    logger.info({ msg: "HTTP server closed" });
    process.exit(0);
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    logger.warn({ msg: "Graceful shutdown timed out, forcing exit" });
    process.exit(1);
  }, config.shutdownTimeoutMs);
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.fatal({ msg: "Uncaught exception", err: error });
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ msg: "Unhandled rejection", reason, promise: String(promise) });
  gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();
