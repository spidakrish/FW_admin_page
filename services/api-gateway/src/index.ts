import type { Server } from "http";
import { createApp, config } from "./app";
import { logger } from "./lib/logger";

// Create the Express application
const app = createApp();

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
