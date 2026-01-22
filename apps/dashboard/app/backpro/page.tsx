import Link from "next/link";
import { ArrowRight, Workflow, Layers } from "lucide-react";

const modules = [
  {
    label: "Frontend Preview",
    description: "Remote module from fw_frontend main branch",
    href: "https://fw-frontend.local",
    status: "Available"
  },
  {
    label: "Gateway DevTools",
    description: "Inspect orchestrator events and streaming chat logs",
    href: "https://gateway.fw-data.local",
    status: "Auth required"
  }
];

const telemetry = [
  { label: "Active agents", value: "8" },
  { label: "Jobs queue", value: "12" },
  { label: "Chat latency", value: "190 ms" }
];

export default function BackproLanding() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand-pewter/20 bg-gradient-to-br from-brand-parchment via-white to-brand-mist px-10 py-12 text-brand-charcoal shadow-card">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-pewter">Backpro Platform</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">AI Platform Control Center</h1>
            <p className="mt-3 text-brand-pewter">
              Wire fw_frontend remote modules, orchestrate ingestion and RAG agents, and surface a unified status view
              for Frazer Walker broker initiatives.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {telemetry.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-brand-pewter/20 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-pewter">{metric.label}</p>
                  <p className="mt-2 text-xl font-semibold text-brand-charcoal">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-glow">
            <div className="flex items-center gap-3 text-sm font-semibold text-brand-teal">
              <Workflow className="h-5 w-5" />
              Platform readiness
            </div>
            <p className="mt-3 text-sm text-brand-pewter">
              Remote micro-frontends are staged. Finish wiring the module federation host to expose Backpro natively.
            </p>
            <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-brand-pewter">
              Next: push staging manifest
            </div>
            <Link
              href="/fw-analysis"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal transition hover:text-brand-teal-deep"
            >
              Review document outputs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-8 bottom-4 h-48 w-48 rounded-full bg-brand-teal/25 blur-3xl" />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.label}
            href={module.href}
            className="flex h-full flex-col rounded-2xl border border-brand-pewter/20 bg-white/90 p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="flex items-center justify-between text-sm font-semibold text-brand-pewter">
              <span>{module.status}</span>
              <Layers className="h-4 w-4 text-brand-teal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold text-brand-charcoal">{module.label}</h3>
            <p className="mt-2 text-sm text-brand-pewter">{module.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal">
              Open
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
