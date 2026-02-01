/**
 * Rate Limiter Middleware Tests
 *
 * Tests the rate limiting middleware for:
 * - Request counting within window
 * - Rate limit enforcement
 * - Health check bypass
 * - X-Forwarded-For header handling
 * - Response headers
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";

// =============================================================================
// TEST APPLICATION SETUP
// =============================================================================

/**
 * Creates a test app with configurable rate limiting.
 * Uses small limits for faster testing.
 */
function createTestApp(options?: { maxRequests?: number; windowMs?: number }): Express {
  const app = express();

  const limiter = rateLimit({
    windowMs: options?.windowMs ?? 60000,
    limit: options?.maxRequests ?? 5, // Low limit for testing
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      status: "error",
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later"
    },
    // Skip rate limiting for health checks
    skip: (req) => req.path === "/api/v1/health",
    // Use request IP as the key
    keyGenerator: (req) => {
      const forwarded = req.headers["x-forwarded-for"];
      if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
      }
      return req.ip ?? "unknown";
    }
  });

  app.use(limiter);

  // Test routes
  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/test", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/test", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("globalRateLimiter middleware", () => {
  // ---------------------------------------------------------------------------
  // BASIC RATE LIMITING TESTS
  // ---------------------------------------------------------------------------

  describe("basic rate limiting", () => {
    let app: Express;

    beforeEach(() => {
      // Create fresh app for each test to reset rate limiter
      app = createTestApp({ maxRequests: 3 });
    });

    it("should allow requests under the limit", async () => {
      const response = await request(app).get("/api/test");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });

    it("should block requests over the limit", async () => {
      // With limit=3, requests 1, 2, 3 are allowed, request 4 is blocked
      await request(app).get("/api/test"); // Request 1 - allowed
      await request(app).get("/api/test"); // Request 2 - allowed
      await request(app).get("/api/test"); // Request 3 - allowed

      // Request 4 should be blocked
      const response = await request(app).get("/api/test");

      expect(response.status).toBe(429);
    });

    it("should return RATE_LIMITED error code when blocked", async () => {
      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        await request(app).get("/api/test");
      }

      const response = await request(app).get("/api/test");

      expect(response.body).toEqual({
        status: "error",
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later"
      });
    });

    it("should count different HTTP methods against the same limit", async () => {
      await request(app).get("/api/test");
      await request(app).post("/api/test");
      await request(app).get("/api/test");

      // Fourth request should be blocked
      const response = await request(app).post("/api/test");

      expect(response.status).toBe(429);
    });
  });

  // ---------------------------------------------------------------------------
  // HEALTH CHECK BYPASS TESTS
  // ---------------------------------------------------------------------------

  describe("health check bypass", () => {
    let app: Express;

    beforeEach(() => {
      app = createTestApp({ maxRequests: 2 });
    });

    it("should not count health checks against rate limit", async () => {
      // Make health check requests (should not count)
      await request(app).get("/api/v1/health");
      await request(app).get("/api/v1/health");
      await request(app).get("/api/v1/health");

      // This regular request should still work (limit is 2)
      const response = await request(app).get("/api/test");

      expect(response.status).toBe(200);
    });

    it("should always allow health checks even when rate limited", async () => {
      // Exhaust the limit with regular requests
      await request(app).get("/api/test");
      await request(app).get("/api/test");

      // Health check should still work
      const healthResponse = await request(app).get("/api/v1/health");
      expect(healthResponse.status).toBe(200);

      // But regular request should be blocked
      const regularResponse = await request(app).get("/api/test");
      expect(regularResponse.status).toBe(429);
    });
  });

  // ---------------------------------------------------------------------------
  // X-FORWARDED-FOR HANDLING TESTS
  // ---------------------------------------------------------------------------

  describe("X-Forwarded-For handling", () => {
    let app: Express;

    beforeEach(() => {
      app = createTestApp({ maxRequests: 2 });
    });

    it("should use X-Forwarded-For header for rate limiting", async () => {
      // Requests from "client A"
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100");
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100");

      // Client A should be rate limited
      const clientAResponse = await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100");
      expect(clientAResponse.status).toBe(429);

      // But "client B" should still be allowed
      const clientBResponse = await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.200");
      expect(clientBResponse.status).toBe(200);
    });

    it("should use first IP from comma-separated X-Forwarded-For", async () => {
      // Both requests should be from the same "client"
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100, 10.0.0.1, 172.16.0.1");
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100, 10.0.0.2");

      // Should be rate limited based on first IP
      const response = await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100");

      expect(response.status).toBe(429);
    });

    it("should handle X-Forwarded-For with whitespace", async () => {
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "  192.168.1.100  ");
      await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", "192.168.1.100");

      // Should count as same client
      const response = await request(app)
        .get("/api/test")
        .set("X-Forwarded-For", " 192.168.1.100 ");

      expect(response.status).toBe(429);
    });
  });

  // ---------------------------------------------------------------------------
  // RESPONSE HEADERS TESTS
  // ---------------------------------------------------------------------------

  /**
   * Helper to parse IETF draft-7 RateLimit header.
   * Format: "limit=X, remaining=Y, reset=Z"
   * @see https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07
   */
  function parseRateLimitHeader(header: string): { limit?: number; remaining?: number; reset?: number } {
    const result: { limit?: number; remaining?: number; reset?: number } = {};
    const parts = header.split(",").map((p) => p.trim());
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value) {
        const numValue = parseInt(value, 10);
        if (key === "limit") result.limit = numValue;
        if (key === "remaining") result.remaining = numValue;
        if (key === "reset") result.reset = numValue;
      }
    }
    return result;
  }

  describe("response headers (IETF draft-7 format)", () => {
    let app: Express;

    beforeEach(() => {
      app = createTestApp({ maxRequests: 5 });
    });

    it("should include combined RateLimit header with limit value", async () => {
      const response = await request(app).get("/api/test");

      expect(response.headers).toHaveProperty("ratelimit");
      const parsed = parseRateLimitHeader(response.headers["ratelimit"]);
      expect(parsed.limit).toBe(5);
    });

    it("should include remaining value in RateLimit header", async () => {
      const response = await request(app).get("/api/test");

      expect(response.headers).toHaveProperty("ratelimit");
      const parsed = parseRateLimitHeader(response.headers["ratelimit"]);
      expect(parsed.remaining).toBe(4);
    });

    it("should decrement remaining value with each request", async () => {
      const response1 = await request(app).get("/api/test");
      const parsed1 = parseRateLimitHeader(response1.headers["ratelimit"]);
      expect(parsed1.remaining).toBe(4);

      const response2 = await request(app).get("/api/test");
      const parsed2 = parseRateLimitHeader(response2.headers["ratelimit"]);
      expect(parsed2.remaining).toBe(3);

      const response3 = await request(app).get("/api/test");
      const parsed3 = parseRateLimitHeader(response3.headers["ratelimit"]);
      expect(parsed3.remaining).toBe(2);
    });

    it("should include reset value in RateLimit header", async () => {
      const response = await request(app).get("/api/test");

      expect(response.headers).toHaveProperty("ratelimit");
      const parsed = parseRateLimitHeader(response.headers["ratelimit"]);
      // Reset should be a positive number (seconds until window resets)
      expect(parsed.reset).toBeGreaterThan(0);
    });

    it("should include Retry-After header when rate limited", async () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await request(app).get("/api/test");
      }

      const response = await request(app).get("/api/test");

      expect(response.status).toBe(429);
      expect(response.headers).toHaveProperty("retry-after");
    });

    it("should not include legacy X-RateLimit headers", async () => {
      const response = await request(app).get("/api/test");

      // Legacy headers should not be present (legacyHeaders: false)
      expect(response.headers).not.toHaveProperty("x-ratelimit-limit");
      expect(response.headers).not.toHaveProperty("x-ratelimit-remaining");
    });

    it("should include RateLimit-Policy header", async () => {
      const response = await request(app).get("/api/test");

      // Draft-7 also includes a RateLimit-Policy header
      expect(response.headers).toHaveProperty("ratelimit-policy");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle missing IP gracefully", async () => {
      const app = createTestApp({ maxRequests: 2 });

      // Supertest doesn't set an IP by default, should use "unknown" or fallback
      const response = await request(app).get("/api/test");

      expect(response.status).toBe(200);
    });

    it("should return JSON content type for 429 response", async () => {
      const app = createTestApp({ maxRequests: 1 });

      await request(app).get("/api/test");
      const response = await request(app).get("/api/test");

      expect(response.status).toBe(429);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });
});
