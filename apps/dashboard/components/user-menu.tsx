"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const isAdmin = session.user.role === "admin";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-brand-charcoal">
          {session.user.email}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isAdmin
              ? "bg-brand-teal/10 text-brand-teal"
              : "bg-brand-pewter/10 text-brand-pewter"
          }`}
        >
          {isAdmin ? "Admin" : "Viewer"}
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-1.5 rounded-lg border border-brand-pewter/30 px-3 py-1.5 text-xs font-medium text-brand-pewter transition hover:border-red-300 hover:text-red-600"
        aria-label="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
