import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { config } from "../config";

/**
 * Application logger instance.
 *
 * Uses Pino for high-performance structured logging in JSON format.
 * - Development: Pretty-printed, colorized output
 * - Production: JSON format for log aggregation (ELK, Datadog, etc.)
 *
 * @see https://github.com/pinojs/pino
 */
export const logger = pino({
  name: "fw-api-gateway",
  level: process.env.LOG_LEVEL ?? (config.isProduction ? "info" : "debug"),

  // Base fields included in every log entry
  base: {
    pid: process.pid,
    env: config.isProduction ? "production" : "development"
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields from logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-fw-admin-key']",
      "req.headers.cookie",
      "res.headers['set-cookie']"
    ],
    censor: "[REDACTED]"
  },

  // Pretty print in development
  transport: config.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      },

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

/**
 * Generates a request ID for correlation tracking.
 * Uses the incoming x-request-id header if present, otherwise generates a new UUID.
 */
function generateRequestId(req: IncomingMessage): string {
  const existingId = req.headers["x-request-id"];
  if (typeof existingId === "string" && existingId.length > 0) {
    return existingId;
  }
  return randomUUID();
}

/**
 * HTTP request logger middleware.
 *
 * Features:
 * - Automatic request/response logging
 * - Request ID generation and correlation
 * - Response time measurement
 * - Attached logger on req.log for use in route handlers
 *
 * @example
 * ```ts
 * app.use(httpLogger);
 *
 * app.get('/api/example', (req, res) => {
 *   req.log.info('Processing request');
 *   res.json({ ok: true });
 * });
 * ```
 */
export const httpLogger = pinoHttp({
  logger,

  // Generate or reuse request ID
  genReqId: generateRequestId,

  // Custom log level based on response status
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    const method = req.method ?? "???";
    const url = req.url ?? "/";
    const status = res.statusCode;
    return `${method} ${url} ${status}`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    const method = req.method ?? "???";
    const url = req.url ?? "/";
    const status = res.statusCode;
    return `${method} ${url} ${status} - ${err.message}`;
  },

  // Custom attributes to add to log entries
  customProps: (req) => ({
    requestId: (req as IncomingMessage & { id?: string }).id
  }),

  // Custom attribute keys
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "durationMs"
  },

  // Don't log health check requests to reduce noise
  autoLogging: {
    ignore: (req) => req.url === "/api/v1/health"
  }
});

/**
 * Middleware to add request ID to response headers.
 * Should be applied after httpLogger.
 */
export const requestIdHeader: RequestHandler = (req, res, next) => {
  // pino-http adds `id` to the request object
  const requestId = (req as Request & { id?: string | number }).id;
  if (requestId !== undefined) {
    res.setHeader("x-request-id", String(requestId));
  }
  next();
};

/**
 * Child logger factory for creating context-specific loggers.
 *
 * @example
 * ```ts
 * const serviceLogger = createChildLogger({ service: 'fw-analysis' });
 * serviceLogger.info('Processing document');
 * ```
 */
export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

// Export logger levels for external use
export type LogLevel = pino.Level;
