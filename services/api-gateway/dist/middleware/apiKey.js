"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyGuard = apiKeyGuard;
const config_1 = require("../config");
function apiKeyGuard(req, res, next) {
    const key = req.headers["x-fw-admin-key"];
    if (!key || Array.isArray(key) || !config_1.config.apiKeys.includes(key)) {
        return res.status(401).json({ status: "unauthorized" });
    }
    return next();
}
