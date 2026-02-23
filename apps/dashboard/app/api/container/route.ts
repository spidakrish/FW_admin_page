import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAzureAccessToken } from "@/lib/azure";

const API_VERSION = "2024-03-01";

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
// GET /api/container — fetch container app status (admin only)
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await getAzureAccessToken();
    const url = `${getContainerAppUrl()}?api-version=${API_VERSION}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure API error (${res.status}): ${text}`);
    }

    const data = await res.json();

    return NextResponse.json({
      name: data.name,
      runningStatus: data.properties?.runningStatus ?? "Unknown",
      provisioningState: data.properties?.provisioningState ?? "Unknown",
      location: data.location,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/container — start or stop the container app (admin only)
//   Body: { action: "start" | "stop" }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action !== "start" && action !== "stop") {
    return NextResponse.json(
      { error: 'Action must be "start" or "stop".' },
      { status: 400 }
    );
  }

  try {
    const token = await getAzureAccessToken();
    const url = `${getContainerAppUrl()}/${action}?api-version=${API_VERSION}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = completed immediately, 202 = accepted (async operation)
    if (res.status !== 200 && res.status !== 202) {
      const text = await res.text();
      throw new Error(`Azure API error (${res.status}): ${text}`);
    }

    return NextResponse.json({
      ok: true,
      action,
      status: res.status === 202 ? "accepted" : "completed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
