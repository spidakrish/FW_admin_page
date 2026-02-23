/**
 * Azure Management API authentication.
 *
 * Strategy (in priority order):
 *   1. Service Principal (AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET)
 *   2. Static token (AZURE_ACCESS_TOKEN) — e.g. from `az account get-access-token`
 *
 * For production, use a Service Principal. For local dev/testing, you can set
 * AZURE_ACCESS_TOKEN from the Azure CLI:
 *   az account get-access-token --resource https://management.azure.com --query accessToken -o tsv
 */

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Acquire a Bearer token for the Azure Resource Manager scope.
 * Caches the token in-memory with a 5-minute safety margin.
 */
export async function getAzureAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  // Strategy 1: Service Principal (preferred for production)
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://management.azure.com/.default",
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure token request failed (${res.status}): ${text}`);
    }

    const data: TokenResponse = await res.json();

    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in - 300) * 1000,
    };

    return cachedToken.token;
  }

  // Strategy 2: Static token from env (for local dev / testing)
  const staticToken = process.env.AZURE_ACCESS_TOKEN;
  if (staticToken) {
    return staticToken;
  }

  throw new Error(
    "Azure auth not configured. Set either AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET (Service Principal), or AZURE_ACCESS_TOKEN (from az CLI)."
  );
}
