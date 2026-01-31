/**
 * Dashboard Configuration
 *
 * All external service URLs are configured via environment variables.
 * In development, these default to localhost for convenience.
 * In production, all URLs must be explicitly configured.
 *
 * Environment variables (prefix with NEXT_PUBLIC_ for client-side access):
 * - NEXT_PUBLIC_FW_ANALYSIS_URL: FW Document Analysis tool URL
 * - NEXT_PUBLIC_BACKPRO_URL: BackPro AI Platform URL
 * - NEXT_PUBLIC_API_GATEWAY_URL: API Gateway URL
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Validates that required URLs are configured in production.
 * Logs warnings in development if using defaults.
 */
function validateConfig() {
  const missingVars: string[] = [];

  if (isProduction) {
    if (!process.env.NEXT_PUBLIC_FW_ANALYSIS_URL) {
      missingVars.push("NEXT_PUBLIC_FW_ANALYSIS_URL");
    }
    if (!process.env.NEXT_PUBLIC_BACKPRO_URL) {
      missingVars.push("NEXT_PUBLIC_BACKPRO_URL");
    }
    if (!process.env.NEXT_PUBLIC_API_GATEWAY_URL) {
      missingVars.push("NEXT_PUBLIC_API_GATEWAY_URL");
    }

    if (missingVars.length > 0) {
      console.error(
        `[CONFIG] Missing required environment variables in production: ${missingVars.join(", ")}`
      );
    }
  }
}

// Run validation on module load
validateConfig();

/**
 * Service URLs configuration.
 * Uses environment variables with localhost fallbacks for development.
 */
export const serviceUrls = {
  /** FW Document Analysis tool URL */
  fwAnalysis: process.env.NEXT_PUBLIC_FW_ANALYSIS_URL ?? "http://localhost:5173",

  /** BackPro AI Platform URL */
  backpro: process.env.NEXT_PUBLIC_BACKPRO_URL ?? "http://localhost:3001",

  /** API Gateway URL */
  apiGateway: process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:8787"
} as const;

/**
 * Checks if the app is running in production mode.
 */
export const config = {
  isProduction,
  serviceUrls
} as const;
