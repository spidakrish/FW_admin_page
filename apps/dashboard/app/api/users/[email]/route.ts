import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/user-store";

interface RouteContext {
  params: Promise<{ email: string }>;
}

// ---------------------------------------------------------------------------
// PATCH /api/users/[email] — update role and/or password (admin only)
// ---------------------------------------------------------------------------

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email: rawEmail } = await context.params;
  const email = decodeURIComponent(rawEmail).toLowerCase().trim();

  let body: { role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role, password } = body;

  // Safety: admin cannot downgrade their own role
  if (email === session.user.email?.toLowerCase() && role && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot downgrade your own admin role." },
      { status: 400 }
    );
  }

  // Validate role if provided
  if (role !== undefined && role !== "admin" && role !== "viewer") {
    return NextResponse.json(
      { error: 'Role must be "admin" or "viewer".' },
      { status: 400 }
    );
  }

  // Validate password if provided
  if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (!role && !password) {
    return NextResponse.json(
      { error: "Provide at least one field to update (role or password)." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUser(email, {
      role: role as "admin" | "viewer" | undefined,
      password: password || undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/[email] — delete a user (admin only)
// ---------------------------------------------------------------------------

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email: rawEmail } = await context.params;
  const email = decodeURIComponent(rawEmail).toLowerCase().trim();

  // Safety: admin cannot delete themselves
  if (email === session.user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  try {
    await deleteUser(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
