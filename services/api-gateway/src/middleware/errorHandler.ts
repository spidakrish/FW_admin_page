import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { config } from "../config";

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
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error for debugging/monitoring
  console.error("[ERROR]", {
    name: err.name,
    message: err.message,
    stack: config.isProduction ? undefined : err.stack
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: "error",
      code: err.code,
      message: err.message
    });
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      status: "error",
      code: "INVALID_JSON",
      message: "Invalid JSON in request body"
    });
    return;
  }

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
  res.status(404).json({
    status: "error",
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`
  });
}
