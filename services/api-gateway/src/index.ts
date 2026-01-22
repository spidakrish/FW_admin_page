import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { apiKeyGuard } from "./middleware/apiKey";
import { fwAnalysisRouter } from "./routes/fwAnalysis";
import { backproRouter } from "./routes/backpro";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/v1/health", (_req, res) => {
  return res.json({
    status: "ok",
    services: {
      fwAnalysis: config.services.fwAnalysis,
      backpro: config.services.backpro
    }
  });
});

app.use("/api/v1/fw-analysis", apiKeyGuard, fwAnalysisRouter);
app.use("/api/v1/backpro", apiKeyGuard, backproRouter);

app.listen(config.port, () => {
  console.log(`API Gateway listening on :${config.port}`);
});
