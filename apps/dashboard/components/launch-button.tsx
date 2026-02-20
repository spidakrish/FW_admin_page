"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RoleGate } from "./role-gate";

export function LaunchButton({ href }: { href: string }) {
  return (
    <div className="mt-6">
      <RoleGate requiredRole="admin">
        <Link
          href={href}
          prefetch={false}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal-deep"
        >
          Launch tool
          <ArrowRight className="h-4 w-4" />
        </Link>
      </RoleGate>
    </div>
  );
}
