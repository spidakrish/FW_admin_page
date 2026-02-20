"use client";

import { useSession } from "next-auth/react";
import { ShieldAlert } from "lucide-react";

interface RoleGateProps {
  requiredRole: "admin" | "viewer";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ requiredRole, children, fallback }: RoleGateProps) {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const userRole = session.user.role;

  // viewer can access viewer-gated content, admin can access everything
  if (requiredRole === "admin" && userRole !== "admin") {
    return (
      fallback ?? (
        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-pewter/10 px-4 py-2 text-sm font-medium text-brand-pewter">
          <ShieldAlert className="h-4 w-4" />
          View only
        </span>
      )
    );
  }

  return <>{children}</>;
}
