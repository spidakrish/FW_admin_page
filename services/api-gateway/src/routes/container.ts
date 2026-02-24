import { Router } from "express";
import { createChildLogger } from "../lib/logger";

const router = Router();
const log = createChildLogger({ service: "container-control" });

const API_VERSION = "2024-03-01";

// ---------------------------------------------------------------------------
// Azure Managed Identity token acquisition
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAzureToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  // Managed Identity (injected by Azure Container Apps runtime)
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;

  if (identityEndpoint && identityHeader) {
    const resource = "https://management.azure.com";
    const url = `${identityEndpoint}?api-version=2019-08-01&resource=${resource}`;

    const res = await fetch(url, {
      headers: { "X-IDENTITY-HEADER": identityHeader },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Managed Identity token request failed (${res.status}): ${text}`);
    }

    const data: TokenResponse = await res.json();

    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in - 300) * 1000,
    };

    log.info("Acquired Azure token via Managed Identity");
    return cachedToken.token;
  }

  throw new Error(
    "Azure Managed Identity not available. Ensure the API Gateway Container App has system-assigned Managed Identity enabled."
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContainerAppUrl(): string {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const containerAppName = process.env.AZURE_CONTAINER_APP_NAME;

  if (!subscriptionId || !resourceGroup || !containerAppName) {
    throw new Error(
      "Azure Container App not configured. Set AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, and AZURE_CONTAINER_APP_NAME."
    );
  }

  return `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${containerAppName}`;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/container/status — fetch container app status
 */
router.get("/status", async (req, res) => {
  const requestLog = req.log ?? log;

  try {
    const token = await getAzureToken();
    const url = `${getContainerAppUrl()}?api-version=${API_VERSION}`;

    const azureRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!azureRes.ok) {
      const text = await azureRes.text();
      requestLog.error({ msg: "Azure API error", status: azureRes.status, body: text });
      return res.status(502).json({
        status: "error",
        code: "AZURE_API_ERROR",
        message: `Azure API error (${azureRes.status})`,
      });
    }

    const data = await azureRes.json();

    return res.json({
      name: data.name,
      runningStatus: data.properties?.runningStatus ?? "Unknown",
      provisioningState: data.properties?.provisioningState ?? "Unknown",
      location: data.location,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    requestLog.error({ msg: "Container status check failed", error: message });
    return res.status(500).json({ status: "error", message });
  }
});

/**
 * POST /api/v1/container/start — start the container app
 */
router.post("/start", async (req, res) => {
  const requestLog = req.log ?? log;

  try {
    const token = await getAzureToken();
    const url = `${getContainerAppUrl()}/start?api-version=${API_VERSION}`;

    const azureRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (azureRes.status !== 200 && azureRes.status !== 202) {
      const text = await azureRes.text();
      requestLog.error({ msg: "Azure start failed", status: azureRes.status, body: text });
      return res.status(502).json({
        status: "error",
        code: "AZURE_API_ERROR",
        message: `Azure API error (${azureRes.status})`,
      });
    }

    requestLog.info("Container start requested");
    return res.json({
      ok: true,
      action: "start",
      status: azureRes.status === 202 ? "accepted" : "completed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    requestLog.error({ msg: "Container start failed", error: message });
    return res.status(500).json({ status: "error", message });
  }
});

/**
 * POST /api/v1/container/stop — stop the container app
 */
router.post("/stop", async (req, res) => {
  const requestLog = req.log ?? log;

  try {
    const token = await getAzureToken();
    const url = `${getContainerAppUrl()}/stop?api-version=${API_VERSION}`;

    const azureRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (azureRes.status !== 200 && azureRes.status !== 202) {
      const text = await azureRes.text();
      requestLog.error({ msg: "Azure stop failed", status: azureRes.status, body: text });
      return res.status(502).json({
        status: "error",
        code: "AZURE_API_ERROR",
        message: `Azure API error (${azureRes.status})`,
      });
    }

    requestLog.info("Container stop requested");
    return res.json({
      ok: true,
      action: "stop",
      status: azureRes.status === 202 ? "accepted" : "completed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    requestLog.error({ msg: "Container stop failed", error: message });
    return res.status(500).json({ status: "error", message });
  }
});

export { router as containerRouter };
