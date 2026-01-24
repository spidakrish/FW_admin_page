import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";

const environments = [
  {
    label: "Local Dev Server",
    description: "Vite dev server running on your workstation for rapid iteration",
    href: "http://localhost:5173",
    status: "Listening"
  },
  {
    label: "Local Preview Tunnel",
    description: "Reuse the same localhost build when exposing it via ngrok/localtunnel",
    href: "http://localhost:5173",
    status: "Shareable"
  }
];

const highlights = [
  { label: "Policies parsed (24h)", value: "312" },
  { label: "Avg. handoff", value: "38 min" },
  { label: "Human QA queue", value: "4 pending" }
];

export default function FWAnalysisLanding() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand-pewter/20 bg-gradient-to-br from-brand-parchment via-white to-brand-mist px-10 py-12 text-brand-charcoal shadow-card">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-pewter">Document Analysis Tool</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">Document Analysis Workspace</h1>
            <p className="mt-3 text-brand-pewter">
              Launch the federated FW Document Analysis UI, monitor extraction throughput, and open the environments
              used by underwriting teams while the integration with fw_frontend is finalised.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight) => (
                <div key={highlight.label} className="rounded-2xl border border-brand-pewter/20 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-pewter">{highlight.label}</p>
                  <p className="mt-2 text-xl font-semibold text-brand-charcoal">{highlight.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-glow">
            <div className="flex items-center gap-3 text-sm font-semibold text-brand-teal">
              <ShieldCheck className="h-5 w-5" />
              Extraction services
            </div>
            <p className="mt-3 text-sm text-brand-pewter">
              OCR, policy comparison, and audit emit health signals every 60 seconds. All cores are currently healthy.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal transition hover:text-brand-teal-deep"
            >
              View routing map
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-6 bottom-6 h-40 w-40 rounded-full bg-brand-teal/20 blur-3xl" />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {environments.map((env) => (
          <Link
            key={env.label}
            href={env.href}
            className="flex h-full flex-col rounded-2xl border border-brand-pewter/20 bg-white/90 p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="flex items-center justify-between text-sm font-semibold text-brand-pewter">
              <span>{env.status}</span>
              <FileText className="h-4 w-4 text-brand-teal" />
            </div>
            <h3 className="mt-3 text-xl font-semibold text-brand-charcoal">{env.label}</h3>
            <p className="mt-2 text-sm text-brand-pewter">{env.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal">
              Open
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-brand-pewter/20 bg-white/80 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-pewter">Operational focus</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-charcoal">Upcoming analysis milestones</h2>
            <p className="mt-2 text-brand-pewter">
              Align data coverage with Frazer Walker broker network deliverables for this quarter.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-brand-charcoal">
            <div className="rounded-2xl bg-brand-mist/60 px-4 py-3">• Expand coverholder RAG prompts</div>
            <div className="rounded-2xl bg-brand-mist/60 px-4 py-3">• Ship AI change-log export for compliance</div>
            <div className="rounded-2xl bg-brand-mist/60 px-4 py-3">• Hook python-demo federation module</div>
          </div>
        </div>
      </section>
    </div>
  );
}
