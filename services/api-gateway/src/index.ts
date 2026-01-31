import type { Server } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { apiKeyGuard } from "./middleware/apiKey";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { fwAnalysisRouter } from "./routes/fwAnalysis";
import { backproRouter } from "./routes/backpro";

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Security headers (XSS protection, content type sniffing prevention, etc.)
app.use(helmet());

// CORS configuration - restrict origins in production
app.use(
  cors({
    origin: config.cors.origins.length > 0 ? config.cors.origins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-fw-admin-key"]
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

// Environment-aware request logging
// - Development: colorized, concise output
// - Production: Apache combined format for log aggregation
app.use(morgan(config.isProduction ? "combined" : "dev"));

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
    console.log(`[INFO] API Gateway listening on :${config.port}`);
    console.log(`[INFO] Environment: ${config.isProduction ? "production" : "development"}`);
  });

  // Handle server errors
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[ERROR] Port ${config.port} is already in use`);
      process.exit(1);
    }
    throw error;
  });
}

function gracefulShutdown(signal: string): void {
  console.log(`[INFO] ${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log("[INFO] HTTP server closed");
    process.exit(0);
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error("[WARN] Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, config.shutdownTimeoutMs);
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();
