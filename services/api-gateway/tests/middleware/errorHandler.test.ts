/**
 * Error Handler Middleware Tests
 *
 * Tests the error handling middleware for:
 * - ApiError handling with custom status codes
 * - JSON parsing error handling
 * - Generic error handling
 * - 404 not found handler
 * - Production vs development error messages
 * - No stack trace leakage in production
 */

import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { errorHandler, notFoundHandler, ApiError } from "../../src/middleware/errorHandler";

// =============================================================================
// TEST APPLICATION SETUP
// =============================================================================

/**
 * Creates a test app with various error-triggering routes.
 */
function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // Route that throws ApiError
  app.get("/api-error", (_req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError(422, "VALIDATION_ERROR", "Invalid input provided"));
  });

  // Route that throws generic Error
  app.get("/generic-error", (_req: Request, _res: Response, next: NextFunction) => {
    next(new Error("Something went wrong internally"));
  });

  // Route that accepts JSON body (for testing JSON parse errors)
  app.post("/json-endpoint", (req: Request, res: Response) => {
    res.json({ received: req.body });
  });

  // Route that throws synchronously
  app.get("/sync-throw", () => {
    throw new Error("Synchronous error");
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("errorHandler middleware", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // API ERROR TESTS
  // ---------------------------------------------------------------------------

  describe("ApiError handling", () => {
    it("should return custom status code from ApiError", async () => {
      const response = await request(app).get("/api-error");

      expect(response.status).toBe(422);
    });

    it("should return custom error code from ApiError", async () => {
      const response = await request(app).get("/api-error");

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return custom message from ApiError", async () => {
      const response = await request(app).get("/api-error");

      expect(response.body.message).toBe("Invalid input provided");
    });

    it("should return complete error structure for ApiError", async () => {
      const response = await request(app).get("/api-error");

      expect(response.body).toEqual({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Invalid input provided"
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GENERIC ERROR TESTS
  // ---------------------------------------------------------------------------

  describe("generic Error handling", () => {
    it("should return 500 for generic errors", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.status).toBe(500);
    });

    it("should return INTERNAL_ERROR code for generic errors", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.body.code).toBe("INTERNAL_ERROR");
    });

    it("should show error message in non-production", async () => {
      // In test environment (not production), error message should be visible
      const response = await request(app).get("/generic-error");

      expect(response.body.message).toBe("Something went wrong internally");
    });

    it("should return JSON content type", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  // ---------------------------------------------------------------------------
  // JSON PARSING ERROR TESTS
  // ---------------------------------------------------------------------------

  describe("JSON parsing error handling", () => {
    it("should return 400 for invalid JSON", async () => {
      const response = await request(app)
        .post("/json-endpoint")
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      expect(response.status).toBe(400);
    });

    it("should return INVALID_JSON code for malformed JSON", async () => {
      const response = await request(app)
        .post("/json-endpoint")
        .set("Content-Type", "application/json")
        .send("{ not: valid }");

      expect(response.body.code).toBe("INVALID_JSON");
    });

    it("should not expose parsing details in error message", async () => {
      const response = await request(app)
        .post("/json-endpoint")
        .set("Content-Type", "application/json")
        .send("{ broken");

      expect(response.body.message).toBe("Invalid JSON in request body");
      // Should not contain parsing error details
      expect(response.body.message).not.toContain("Unexpected");
      expect(response.body.message).not.toContain("position");
    });
  });

  // ---------------------------------------------------------------------------
  // SYNCHRONOUS THROW TESTS
  // ---------------------------------------------------------------------------

  describe("synchronous throw handling", () => {
    it("should catch synchronously thrown errors", async () => {
      const response = await request(app).get("/sync-throw");

      expect(response.status).toBe(500);
      expect(response.body.code).toBe("INTERNAL_ERROR");
    });
  });

  // ---------------------------------------------------------------------------
  // RESPONSE FORMAT TESTS
  // ---------------------------------------------------------------------------

  describe("response format", () => {
    it("should always include status field", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.body).toHaveProperty("status", "error");
    });

    it("should always include code field", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.body).toHaveProperty("code");
      expect(typeof response.body.code).toBe("string");
    });

    it("should always include message field", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    });

    it("should not include stack trace in response", async () => {
      const response = await request(app).get("/generic-error");

      expect(response.body).not.toHaveProperty("stack");
      expect(response.body).not.toHaveProperty("trace");
    });
  });
});

// =============================================================================
// NOT FOUND HANDLER TESTS
// =============================================================================

describe("notFoundHandler middleware", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  // ---------------------------------------------------------------------------
  // 404 RESPONSE TESTS
  // ---------------------------------------------------------------------------

  describe("404 responses", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/nonexistent-route");

      expect(response.status).toBe(404);
    });

    it("should return NOT_FOUND error code", async () => {
      const response = await request(app).get("/some/random/path");

      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should include method and path in message", async () => {
      const response = await request(app).get("/test/path");

      expect(response.body.message).toContain("GET");
      expect(response.body.message).toContain("/test/path");
    });

    it("should handle different HTTP methods", async () => {
      const getResponse = await request(app).get("/unknown");
      const postResponse = await request(app).post("/unknown");
      const putResponse = await request(app).put("/unknown");

      expect(getResponse.body.message).toContain("GET");
      expect(postResponse.body.message).toContain("POST");
      expect(putResponse.body.message).toContain("PUT");
    });

    it("should return JSON content type", async () => {
      const response = await request(app).get("/not-found");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return complete error structure", async () => {
      const response = await request(app).delete("/api/v1/unknown");

      expect(response.body).toEqual({
        status: "error",
        code: "NOT_FOUND",
        message: "Route DELETE /api/v1/unknown not found"
      });
    });
  });
});

// =============================================================================
// API ERROR CLASS TESTS
// =============================================================================

describe("ApiError class", () => {
  it("should create error with correct properties", () => {
    const error = new ApiError(400, "BAD_REQUEST", "Invalid input");

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Invalid input");
    expect(error.name).toBe("ApiError");
  });

  it("should be instanceof Error", () => {
    const error = new ApiError(500, "SERVER_ERROR", "Oops");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it("should have stack trace", () => {
    const error = new ApiError(404, "NOT_FOUND", "Resource not found");

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ApiError");
  });
});
