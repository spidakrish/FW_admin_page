import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(role: "admin" | "viewer") {
  const session = await getSession();
  if (!session) return null;
  if (role === "admin" && session.user.role !== "admin") return null;
  return session;
}
