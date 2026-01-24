"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: parseInt(process.env.PORT ?? "8787", 10),
    services: {
        fwAnalysis: process.env.FW_ANALYSIS_SERVICE_URL ?? "http://localhost:5050",
        backpro: process.env.BACKPRO_SERVICE_URL ?? "http://localhost:8000"
    },
    apiKeys: (process.env.FW_ADMIN_API_KEYS ?? "dev").split(",").map((key) => key.trim())
};
