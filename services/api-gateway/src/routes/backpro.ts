import type { ClientRequest } from "http";
import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const response = await fetch(new URL("/health", config.services.backpro));
    const data = await response.json();
    return res.json({ status: "ok", service: "backpro", data });
  } catch (error) {
    return res.status(502).json({ status: "error", service: "backpro", message: String(error) });
  }
});

router.use(
  "/",
  createProxyMiddleware({
    target: config.services.backpro,
    changeOrigin: true,
    proxyTimeout: 300000,
    timeout: 300000,
    on: {
      proxyReq: (proxyReq: ClientRequest) => {
        proxyReq.removeHeader("x-fw-admin-key");
      }
    }
  })
);

export { router as backproRouter };
