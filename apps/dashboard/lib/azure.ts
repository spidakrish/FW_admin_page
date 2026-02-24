/**
 * Azure Management API authentication.
 *
 * Strategy (in priority order):
 *   1. Managed Identity (when running on Azure — SWA, App Service, Container Apps)
 *      Uses IDENTITY_ENDPOINT + IDENTITY_HEADER (Azure SWA) or IMDS endpoint.
 *   2. Service Principal (AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET)
 *   3. Static token (AZURE_ACCESS_TOKEN) — for local dev / testing only.
 *
 * For production on Azure SWA, enable Managed Identity in the Azure portal:
 *   Static Web App → Settings → Identity → System assigned → On
 *   Then grant it "Contributor" role on the Container App.
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

  // Strategy 1: Managed Identity (Azure SWA / App Service / Container Apps)
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;

  if (identityEndpoint && identityHeader) {
    // Azure Static Web Apps / App Service Managed Identity
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

    return cachedToken.token;
  }

  // Strategy 2: Service Principal (preferred for non-Azure hosting)
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

  // Strategy 3: Static token from env (for local dev / testing)
  const staticToken = process.env.AZURE_ACCESS_TOKEN;
  if (staticToken) {
    return staticToken;
  }

  throw new Error(
    "Azure auth not configured. Set either: " +
    "(1) Enable Managed Identity on Azure SWA, " +
    "(2) AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET, or " +
    "(3) AZURE_ACCESS_TOKEN (from az CLI for local dev)."
  );
}
