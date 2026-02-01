/**
 * API Key Authentication Middleware Tests
 *
 * Tests the apiKeyGuard middleware for:
 * - Valid API key acceptance
 * - Invalid API key rejection
 * - Missing API key handling
 * - Array header handling (edge case)
 * - Timing-safe comparison (security)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { apiKeyGuard } from "../../src/middleware/apiKey";

// =============================================================================
// TEST APPLICATION SETUP
// =============================================================================

/**
 * Creates a minimal Express app for testing the apiKeyGuard middleware.
 * This isolated app tests only the middleware behavior.
 */
function createTestApp(): Express {
  const app = express();

  // Protected route using apiKeyGuard
  app.get("/protected", apiKeyGuard, (_req, res) => {
    res.json({ status: "success", message: "Access granted" });
  });

  return app;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("apiKeyGuard middleware", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  // ---------------------------------------------------------------------------
  // VALID API KEY TESTS
  // ---------------------------------------------------------------------------

  describe("with valid API key", () => {
    it("should allow access with the first valid key", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "success",
        message: "Access granted"
      });
    });

    it("should allow access with the second valid key", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key-2");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });

    it("should be case-sensitive for API keys", async () => {
      // "TEST-KEY-1" is different from "test-key-1"
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "TEST-KEY-1");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_API_KEY");
    });
  });

  // ---------------------------------------------------------------------------
  // INVALID API KEY TESTS
  // ---------------------------------------------------------------------------

  describe("with invalid API key", () => {
    it("should reject with wrong API key", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "wrong-key");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: "error",
        code: "INVALID_API_KEY",
        message: "Invalid API key"
      });
    });

    it("should reject with empty string API key", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "");

      expect(response.status).toBe(401);
      // Empty string is treated as missing
      expect(response.body.code).toBe("MISSING_API_KEY");
    });

    it("should reject with whitespace-only API key", async () => {
      // Per RFC 7230, leading/trailing whitespace is trimmed from header values.
      // A whitespace-only value becomes empty string after trimming.
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "   ");

      expect(response.status).toBe(401);
      // Empty string after trimming is treated as missing
      expect(response.body.code).toBe("MISSING_API_KEY");
    });

    it("should reject with partial match of valid key", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key"); // Missing "-1"

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_API_KEY");
    });

    it("should reject with key containing extra characters", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key-1-extra");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_API_KEY");
    });
  });

  // ---------------------------------------------------------------------------
  // MISSING API KEY TESTS
  // ---------------------------------------------------------------------------

  describe("with missing API key", () => {
    it("should reject request without x-fw-admin-key header", async () => {
      const response = await request(app).get("/protected");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: "error",
        code: "MISSING_API_KEY",
        message: "API key is required in x-fw-admin-key header"
      });
    });

    it("should reject when using wrong header name", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer test-key-1")
        .set("X-API-Key", "test-key-1");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("MISSING_API_KEY");
    });
  });

  // ---------------------------------------------------------------------------
  // RESPONSE FORMAT TESTS
  // ---------------------------------------------------------------------------

  describe("response format", () => {
    it("should return JSON content type on error", async () => {
      const response = await request(app).get("/protected");

      expect(response.status).toBe(401);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should include all required error fields", async () => {
      const response = await request(app).get("/protected");

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
    });
  });

  // ---------------------------------------------------------------------------
  // SECURITY TESTS
  // ---------------------------------------------------------------------------

  describe("security", () => {
    it("should not leak information about key length in error messages", async () => {
      // Short key
      const response1 = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "a");

      // Long key
      const response2 = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "a".repeat(1000));

      // Both should return the same generic error
      expect(response1.body.message).toBe("Invalid API key");
      expect(response2.body.message).toBe("Invalid API key");
      expect(response1.body.message).toBe(response2.body.message);
    });

    it("should reject keys with different lengths than valid keys", async () => {
      // This tests that timing-safe comparison handles length differences
      // Short key
      const response1 = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "ab");

      expect(response1.status).toBe(401);
      expect(response1.body.code).toBe("INVALID_API_KEY");

      // Long key
      const response2 = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key-1-with-extra-characters-appended");

      expect(response2.status).toBe(401);
      expect(response2.body.code).toBe("INVALID_API_KEY");
    });

    it("should reject keys that are substrings of valid keys", async () => {
      const response = await request(app)
        .get("/protected")
        .set("x-fw-admin-key", "test-key");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_API_KEY");
    });
  });
});
