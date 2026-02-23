import Image from "next/image";
import Link from "next/link";
import { routes } from "../lib/routes";
import { UserMenu } from "./user-menu";
import { AdminNav } from "./admin-nav";

const publicRoutes = routes.filter((r) => !("adminOnly" in r && r.adminOnly));
const adminRoutes = routes.filter((r) => "adminOnly" in r && r.adminOnly);

export function Navigation() {
  return (
    <header className="border-b border-brand-pewter/20 bg-white/95 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <div className="flex items-center">
          <Link href="/" aria-label="Frazer Walker home" className="block">
            <Image
              src="/frazerwalker-logo.svg"
              alt="Frazer Walker"
              width={446}
              height={69}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold text-brand-pewter">
          {publicRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              prefetch={!("external" in route && route.external)}
              target={"external" in route && route.external ? "_blank" : undefined}
              rel={"external" in route && route.external ? "noreferrer" : undefined}
              className="group relative transition hover:text-brand-teal"
            >
              {route.label}
              <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-brand-teal transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
          <AdminNav items={adminRoutes} />
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
