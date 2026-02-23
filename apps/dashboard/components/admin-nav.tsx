"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

interface AdminNavProps {
  items: { label: string; href: string }[];
}

export function AdminNav({ items }: AdminNavProps) {
  const { data: session } = useSession();
  if (session?.user.role !== "admin") return null;

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group relative transition hover:text-brand-teal"
        >
          {item.label}
          <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-brand-teal transition-transform duration-200 group-hover:scale-x-100" />
        </Link>
      ))}
    </>
  );
}
