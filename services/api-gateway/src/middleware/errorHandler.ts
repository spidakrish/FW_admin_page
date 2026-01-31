import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { config } from "../config";
import { logger } from "../lib/logger";

/**
 * Custom error class for API errors with status codes.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 * In production, internal error details are hidden from clients.
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Use request-scoped logger if available, otherwise use global logger
  const log = req.log ?? logger;

  // Handle known API errors
  if (err instanceof ApiError) {
    log.warn({
      msg: "API error",
      code: err.code,
      statusCode: err.statusCode,
      error: err.message
    });

    res.status(err.statusCode).json({
      status: "error",
      code: err.code,
      message: err.message
    });
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && "body" in err) {
    log.warn({
      msg: "Invalid JSON in request body",
      error: err.message
    });

    res.status(400).json({
      status: "error",
      code: "INVALID_JSON",
      message: "Invalid JSON in request body"
    });
    return;
  }

  // Log all other errors as errors (these are unexpected)
  log.error({
    msg: "Unhandled error",
    err,
    stack: err.stack
  });

  // Handle all other errors
  res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: config.isProduction ? "An internal error occurred" : err.message
  });
};

/**
 * 404 handler for unknown routes.
 * Must be registered after all other routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  const log = req.log ?? logger;

  log.debug({
    msg: "Route not found",
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    status: "error",
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`
  });
}
