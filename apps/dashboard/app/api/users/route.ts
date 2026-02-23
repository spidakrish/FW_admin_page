import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUsers, createUser } from "@/lib/user-store";

// ---------------------------------------------------------------------------
// GET /api/users — list all users (admin only)
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/users — create a new user (admin only)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, role } = body;

  // Validate email
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  // Validate password
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Validate role
  if (role !== "admin" && role !== "viewer") {
    return NextResponse.json(
      { error: 'Role must be "admin" or "viewer".' },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(email, password, role);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
