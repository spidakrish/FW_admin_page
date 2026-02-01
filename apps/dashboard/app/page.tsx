import Link from "next/link";
import { FileText, Workflow, ArrowRight } from "lucide-react";
import { serviceUrls, config } from "@/lib/config";
import { ServiceStatus } from "@/components/service-status";

const workspaces = [
  {
    title: "Document Analysis Tool",
    description: "Use the internal Frazer Walker analysis tool to upload policies and review structured outputs.",
    href: serviceUrls.fwAnalysis,
    icon: FileText,
    status: "Launch ready",
    note: config.isProduction ? "Document analysis service" : "Running locally on port 5173"
  },
  {
    title: "BackPro AI Platform",
    description: "Jump into the platform to ingest compliance evidence, spin up RAG agents, and orchestrate audits end to end.",
    href: serviceUrls.backpro,
    icon: Workflow,
    status: "Preview",
    note: config.isProduction ? "BackPro AI platform" : "Start with: cd fw_frontend && npm run dev"
  }
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* Service Status Panel */}
      <ServiceStatus />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-pewter/20 bg-gradient-to-br from-brand-parchment via-white to-brand-mist px-10 py-12 text-brand-charcoal shadow-card">
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.45em] text-brand-pewter">Frazer Walker</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Document intelligence crafted for Frazer Walker
            </h1>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -right-10 top-10 h-64 w-64 rounded-full bg-brand-teal-soft/40 blur-3xl" />
          <div className="absolute bottom-4 left-6 h-40 w-40 rounded-full bg-brand-teal/20 blur-3xl" />
        </div>
      </section>

      <section className="rounded-3xl border border-brand-pewter/20 bg-white/90 p-8 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-pewter">Workspaces</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-charcoal">Jump into active FW surfaces</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {workspaces.map((workspace) => (
            <article
              key={workspace.title}
              className="flex h-full flex-col rounded-2xl border border-brand-pewter/25 bg-gradient-to-br from-white via-white to-brand-mist/60 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-brand-pewter">
                <workspace.icon className="h-5 w-5 text-brand-teal" />
                {workspace.status}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-brand-charcoal">{workspace.title}</h3>
              <p className="mt-2 text-sm text-brand-pewter">{workspace.description}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.35em] text-brand-pewter">
                {workspace.note}
              </p>
              <Link
                href={workspace.href}
                prefetch={false}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal-deep"
              >
                Launch tool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
