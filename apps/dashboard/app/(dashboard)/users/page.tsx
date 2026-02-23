import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  const session = await requireRole("admin");
  if (!session) redirect("/");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-pewter/20 bg-gradient-to-br from-brand-parchment via-white to-brand-mist px-10 py-12 text-brand-charcoal shadow-card">
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.45em] text-brand-pewter">
            Administration
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            User Management
          </h1>
          <p className="max-w-xl text-sm text-brand-pewter">
            Add, edit, and remove dashboard users. Changes take effect
            immediately&nbsp;&mdash; no redeployment required.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -right-10 top-10 h-64 w-64 rounded-full bg-brand-teal-soft/40 blur-3xl" />
          <div className="absolute bottom-4 left-6 h-40 w-40 rounded-full bg-brand-teal/20 blur-3xl" />
        </div>
      </section>

      {/* CRUD table (client component) */}
      <UserManagement currentEmail={session.user.email} />
    </div>
  );
}
