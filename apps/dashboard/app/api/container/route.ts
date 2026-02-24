import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { serviceUrls } from "@/lib/config";

/**
 * Container control proxy — routes through the API Gateway.
 *
 * The API Gateway Container App has Managed Identity enabled and
 * Contributor role on the document processor Container App, so it
 * can call the Azure Management API without any stored credentials.
 *
 * Dashboard (SWA) → API Gateway (Container App + Managed Identity) → Azure Management API
 */

const GATEWAY_BASE = serviceUrls.apiGateway;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

// ---------------------------------------------------------------------------
// GET /api/container — fetch container app status (admin only)
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const res = await fetch(`${GATEWAY_BASE}/api/v1/container/status`, {
      headers: { "x-fw-admin-key": API_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? `Gateway error (${res.status})`);
    }

    return NextResponse.json(await res.json());
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
    const res = await fetch(`${GATEWAY_BASE}/api/v1/container/${action}`, {
      method: "POST",
      headers: {
        "x-fw-admin-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? `Gateway error (${res.status})`);
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
