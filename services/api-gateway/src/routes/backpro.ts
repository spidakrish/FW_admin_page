import type { ClientRequest } from "http";
import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config";

const router = Router();

/**
 * Health check endpoint for backpro service.
 * Properly verifies upstream health status before returning success.
 */
router.get("/health", async (_req, res) => {
  const serviceName = "backpro";
  const healthUrl = new URL("/health", config.services.backpro);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    clearTimeout(timeoutId);

    // Verify the upstream service actually returned a success status
    if (!response.ok) {
      console.error(`[HEALTH] ${serviceName} returned status ${response.status}`);
      return res.status(503).json({
        status: "unhealthy",
        service: serviceName,
        code: "UPSTREAM_ERROR",
        message: "Upstream service returned an error status"
      });
    }

    // Parse and validate response
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      console.error(`[HEALTH] ${serviceName} returned invalid JSON`);
      return res.status(503).json({
        status: "unhealthy",
        service: serviceName,
        code: "INVALID_RESPONSE",
        message: "Upstream service returned invalid response"
      });
    }

    return res.json({
      status: "healthy",
      service: serviceName,
      upstream: data
    });
  } catch (error) {
    // Log full error details server-side for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = error instanceof Error && error.name === "AbortError";

    console.error(`[HEALTH] ${serviceName} check failed:`, {
      error: errorMessage,
      url: healthUrl.toString(),
      isTimeout
    });

    // Return generic error to client - don't leak internal details
    return res.status(503).json({
      status: "unhealthy",
      service: serviceName,
      code: isTimeout ? "TIMEOUT" : "CONNECTION_FAILED",
      message: isTimeout
        ? "Health check timed out"
        : "Unable to connect to upstream service"
    });
  }
});

/**
 * Proxy middleware for all other backpro requests.
 */
router.use(
  "/",
  createProxyMiddleware({
    target: config.services.backpro,
    changeOrigin: true,
    proxyTimeout: 300000,
    timeout: 300000,
    on: {
      proxyReq: (proxyReq: ClientRequest) => {
        // Remove gateway authentication header before forwarding
        proxyReq.removeHeader("x-fw-admin-key");
      },
      error: (err, _req, res) => {
        // Log full error server-side
        console.error("[PROXY] backpro proxy error:", err.message);

        // Return generic error to client
        if (res && "status" in res && typeof res.status === "function") {
          res.status(502).json({
            status: "error",
            code: "PROXY_ERROR",
            message: "Unable to reach upstream service"
          });
        }
      }
    }
  })
);

export { router as backproRouter };
