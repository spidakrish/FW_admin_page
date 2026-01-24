"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const apiKey_1 = require("./middleware/apiKey");
const fwAnalysis_1 = require("./routes/fwAnalysis");
const backpro_1 = require("./routes/backpro");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.get("/api/v1/health", (_req, res) => {
    return res.json({
        status: "ok",
        services: {
            fwAnalysis: config_1.config.services.fwAnalysis,
            backpro: config_1.config.services.backpro
        }
    });
});
app.use("/api/v1/fw-analysis", apiKey_1.apiKeyGuard, fwAnalysis_1.fwAnalysisRouter);
app.use("/api/v1/backpro", apiKey_1.apiKeyGuard, backpro_1.backproRouter);
app.listen(config_1.config.port, () => {
    console.log(`API Gateway listening on :${config_1.config.port}`);
});
