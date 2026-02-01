"use client";

import { useEffect, useState, useCallback } from "react";
import { serviceUrls } from "@/lib/config";

// =============================================================================
// TYPES
// =============================================================================

interface ServiceHealth {
  name: string;
  status: "healthy" | "unhealthy";
  latencyMs: number;
}

interface ServicesStatusResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  gateway: {
    status: "healthy" | "unhealthy";
    version: string;
  };
  services: {
    fwAnalysis: ServiceHealth;
    backpro: ServiceHealth;
  };
}

type FetchState = "loading" | "success" | "error";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Polling interval for health checks (30 seconds) */
const POLL_INTERVAL_MS = 30000;

/** Request timeout (10 seconds) */
const REQUEST_TIMEOUT_MS = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ServiceStatus component displays real-time health status of all services.
 * Polls the gateway's /api/v1/services/status endpoint periodically.
 *
 * Features:
 * - Visual status indicators (green/yellow/red dots)
 * - Auto-refresh every 30 seconds
 * - Manual refresh button
 * - Latency display for each service
 */
export function ServiceStatus() {
  const [data, setData] = useState<ServicesStatusResponse | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${serviceUrls.apiGateway}/api/v1/services/status`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json: ServicesStatusResponse = await response.json();
      setData(json);
      setFetchState("success");
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch service status:", error);
      setFetchState("error");
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();

    const intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchStatus]);

  return (
    <div className="rounded-2xl border border-brand-pewter/20 bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-pewter">
            System Status
          </h3>
          <OverallStatusBadge fetchState={fetchState} status={data?.status} />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-brand-pewter">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={fetchStatus}
            disabled={fetchState === "loading"}
            className="rounded-lg border border-brand-pewter/30 px-3 py-1.5 text-xs font-medium text-brand-pewter transition hover:border-brand-teal hover:text-brand-teal disabled:opacity-50"
            aria-label="Refresh status"
          >
            {fetchState === "loading" ? "Checking..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ServiceCard
          name="API Gateway"
          status={fetchState === "error" ? "unhealthy" : data?.gateway.status ?? "unknown"}
          latencyMs={null}
          version={data?.gateway.version}
        />
        <ServiceCard
          name="Document Analysis"
          status={fetchState === "error" ? "unknown" : data?.services.fwAnalysis.status ?? "unknown"}
          latencyMs={data?.services.fwAnalysis.latencyMs}
        />
        <ServiceCard
          name="BackPro Platform"
          status={fetchState === "error" ? "unknown" : data?.services.backpro.status ?? "unknown"}
          latencyMs={data?.services.backpro.latencyMs}
        />
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function OverallStatusBadge({
  fetchState,
  status
}: {
  fetchState: FetchState;
  status?: "healthy" | "degraded";
}) {
  if (fetchState === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pewter/10 px-2.5 py-1 text-xs font-medium text-brand-pewter">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-pewter" />
        Checking
      </span>
    );
  }

  if (fetchState === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Unavailable
      </span>
    );
  }

  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        All Systems Operational
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Degraded
    </span>
  );
}

function ServiceCard({
  name,
  status,
  latencyMs,
  version
}: {
  name: string;
  status: "healthy" | "unhealthy" | "unknown";
  latencyMs: number | null | undefined;
  version?: string;
}) {
  const statusConfig = {
    healthy: {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      label: "Healthy"
    },
    unhealthy: {
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      label: "Unhealthy"
    },
    unknown: {
      dot: "bg-brand-pewter",
      text: "text-brand-pewter",
      bg: "bg-brand-pewter/10",
      label: "Unknown"
    }
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-xl border border-brand-pewter/15 bg-gradient-to-br from-white to-brand-mist/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-brand-charcoal">{name}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
        {latencyMs !== null && latencyMs !== undefined && (
          <span className="text-xs text-brand-pewter">{latencyMs}ms</span>
        )}
        {version && (
          <span className="text-xs text-brand-pewter">v{version}</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
