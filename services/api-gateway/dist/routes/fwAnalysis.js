"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fwAnalysisRouter = void 0;
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const config_1 = require("../config");
const router = (0, express_1.Router)();
exports.fwAnalysisRouter = router;
router.get("/health", async (_req, res) => {
    try {
        const response = await fetch(new URL("/health", config_1.config.services.fwAnalysis));
        const data = await response.json();
        return res.json({ status: "ok", service: "fw-analysis", data });
    }
    catch (error) {
        return res.status(502).json({ status: "error", service: "fw-analysis", message: String(error) });
    }
});
router.use("/", (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: config_1.config.services.fwAnalysis,
    changeOrigin: true,
    proxyTimeout: 300000,
    timeout: 300000,
    on: {
        proxyReq: (proxyReq) => {
            proxyReq.removeHeader("x-fw-admin-key");
        }
    }
}));
