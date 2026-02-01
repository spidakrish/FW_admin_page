/**
 * Health Endpoint Tests
 *
 * Tests the health check endpoints:
 * - GET /api/v1/health (gateway health)
 * - GET /api/v1/services/status (aggregated services status)
 */

import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app";

// =============================================================================
// TEST SUITE
// =============================================================================

describe("Health endpoints", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp({ skipRateLimiter: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // GATEWAY HEALTH ENDPOINT
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/health", () => {
    it("should return 200 status", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.status).toBe(200);
    });

    it("should return status: ok", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.body.status).toBe("ok");
    });

    it("should include timestamp in ISO 8601 format", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.body.timestamp).toBeDefined();
      // Verify it's a valid ISO date
      const date = new Date(response.body.timestamp);
      expect(date.toISOString()).toBe(response.body.timestamp);
    });

    it("should include version", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.body.version).toBeDefined();
      expect(typeof response.body.version).toBe("string");
    });

    it("should return JSON content type", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should not require authentication", async () => {
      // No x-fw-admin-key header
      const response = await request(app).get("/api/v1/health");

      expect(response.status).toBe(200);
    });

    it("should return complete response structure", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
      expect(Object.keys(response.body)).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // SERVICES STATUS ENDPOINT
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/services/status", () => {
    it("should return 200 status", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.status).toBe(200);
    });

    it("should not require authentication", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.status).toBe(200);
    });

    it("should include overall status", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.body.status).toBeDefined();
      expect(["healthy", "degraded"]).toContain(response.body.status);
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.body.timestamp).toBeDefined();
      const date = new Date(response.body.timestamp);
      expect(date.toISOString()).toBe(response.body.timestamp);
    });

    it("should include gateway status", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.body.gateway).toBeDefined();
      expect(response.body.gateway.status).toBe("healthy");
      expect(response.body.gateway.version).toBeDefined();
    });

    it("should include services object", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.body.services).toBeDefined();
      expect(response.body.services.fwAnalysis).toBeDefined();
      expect(response.body.services.backpro).toBeDefined();
    });

    it("should include service health details", async () => {
      const response = await request(app).get("/api/v1/services/status");

      const fwAnalysis = response.body.services.fwAnalysis;
      expect(fwAnalysis).toHaveProperty("name");
      expect(fwAnalysis).toHaveProperty("status");
      expect(fwAnalysis).toHaveProperty("latencyMs");
      expect(["healthy", "unhealthy"]).toContain(fwAnalysis.status);
      expect(typeof fwAnalysis.latencyMs).toBe("number");
    });

    it("should return degraded status when services are unhealthy", async () => {
      // Since test services aren't running, they should be unhealthy
      const response = await request(app).get("/api/v1/services/status");

      // Both services should be unhealthy in test environment
      expect(response.body.services.fwAnalysis.status).toBe("unhealthy");
      expect(response.body.services.backpro.status).toBe("unhealthy");
      expect(response.body.status).toBe("degraded");
    });

    it("should return JSON content type", async () => {
      const response = await request(app).get("/api/v1/services/status");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should complete within reasonable time", async () => {
      const startTime = Date.now();
      await request(app).get("/api/v1/services/status");
      const duration = Date.now() - startTime;

      // Should complete within 15 seconds (5s timeout per service + overhead)
      expect(duration).toBeLessThan(15000);
    });
  });

  // ---------------------------------------------------------------------------
  // PROTECTED ENDPOINTS REQUIRE AUTH
  // ---------------------------------------------------------------------------

  describe("protected endpoints", () => {
    it("should require auth for /api/v1/fw-analysis/health", async () => {
      const response = await request(app).get("/api/v1/fw-analysis/health");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("MISSING_API_KEY");
    });

    it("should require auth for /api/v1/backpro/health", async () => {
      const response = await request(app).get("/api/v1/backpro/health");

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("MISSING_API_KEY");
    });

    it("should allow access to fw-analysis health with valid key", async () => {
      const response = await request(app)
        .get("/api/v1/fw-analysis/health")
        .set("x-fw-admin-key", "test-key-1");

      // Will return 503 because service isn't running, but auth passes
      expect([200, 503]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    it("should allow access to backpro health with valid key", async () => {
      const response = await request(app)
        .get("/api/v1/backpro/health")
        .set("x-fw-admin-key", "test-key-1");

      // Will return 503 because service isn't running, but auth passes
      expect([200, 503]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });
  });
});
