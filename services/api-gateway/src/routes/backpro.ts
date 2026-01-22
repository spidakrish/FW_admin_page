import { Router } from "express";
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

export { router as backproRouter };
