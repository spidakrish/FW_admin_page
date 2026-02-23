"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Power, PowerOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContainerStatus {
  name: string;
  runningStatus: "Running" | "Stopped" | "Progressing" | "Unknown";
  provisioningState: string;
  location: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContainerControl() {
  const [status, setStatus] = useState<ContainerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/container");
      if (res.status === 403) {
        // Not admin — hide the control entirely
        setStatus(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch container status");
      }
      const data: ContainerStatus = await res.json();
      setStatus(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleAction(action: "start" | "stop") {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/container", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${action} container`);
      }
      // Poll more frequently after an action to catch the transition
      setTimeout(fetchStatus, 3000);
      setTimeout(fetchStatus, 8000);
      setTimeout(fetchStatus, 15000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Don't render anything while loading initial state or if not admin
  if (loading) return null;
  if (!status && !error) return null;

  const isRunning = status?.runningStatus === "Running";
  const isStopped = status?.runningStatus === "Stopped";
  const isTransitioning = status?.runningStatus === "Progressing" || actionLoading;

  const statusConfig = {
    Running: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Running" },
    Stopped: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Stopped" },
    Progressing: { dot: "bg-amber-500 animate-pulse", text: "text-amber-700", bg: "bg-amber-50", label: "Transitioning" },
    Unknown: { dot: "bg-brand-pewter", text: "text-brand-pewter", bg: "bg-brand-pewter/10", label: "Unknown" },
  };

  const cfg = statusConfig[status?.runningStatus ?? "Unknown"];

  return (
    <div className="rounded-2xl border border-brand-pewter/20 bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-pewter">
            Document Processor
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-600">{error}</span>
          )}

          {isRunning && (
            <button
              onClick={() => handleAction("stop")}
              disabled={isTransitioning}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {isTransitioning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PowerOff className="h-3.5 w-3.5" />
              )}
              Stop
            </button>
          )}

          {isStopped && (
            <button
              onClick={() => handleAction("start")}
              disabled={isTransitioning}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              {isTransitioning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
              Start
            </button>
          )}

          {isTransitioning && !isRunning && !isStopped && (
            <span className="inline-flex items-center gap-2 text-xs text-amber-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Transitioning...
            </span>
          )}
        </div>
      </div>

      {status && (
        <div className="mt-3 flex items-center gap-4 text-xs text-brand-pewter">
          <span>{status.name}</span>
          <span className="text-brand-pewter/40">|</span>
          <span>{status.location}</span>
          <span className="text-brand-pewter/40">|</span>
          <span>{status.provisioningState}</span>
        </div>
      )}
    </div>
  );
}
