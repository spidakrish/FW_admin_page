import { z } from "zod";

// =============================================================================
// ENVIRONMENT SCHEMA DEFINITION
// =============================================================================

const isProduction = process.env.NODE_ENV === "production";

/**
 * URL validation schema - ensures valid HTTP/HTTPS URLs
 */
const urlSchema = z.string().url().refine(
  (url) => url.startsWith("http://") || url.startsWith("https://"),
  { message: "URL must use http:// or https:// protocol" }
);

/**
 * API keys schema - validates format and requires non-empty keys
 */
const apiKeysSchema = z.string().transform((val) =>
  val.split(",").map((key) => key.trim()).filter((key) => key.length > 0)
).refine(
  (keys) => keys.length > 0,
  { message: "At least one API key must be configured" }
).refine(
  (keys) => isProduction ? keys.every((key) => key !== "dev") : true,
  { message: "Default 'dev' API key is not allowed in production" }
);

/**
 * CORS origins schema
 */
const corsOriginsSchema = z.string().optional().transform((val) => {
  if (!val) {
    // In production, require explicit origins; in dev, allow common local ports
    return isProduction ? [] : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
  }
  return val.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0);
});

/**
 * Complete environment configuration schema
 */
const envSchema = z.object({
  // Server configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(65535)).default("8787"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Upstream service URLs - required in production, defaults in development
  FW_ANALYSIS_SERVICE_URL: isProduction
    ? urlSchema
    : urlSchema.default("http://localhost:5050"),
  BACKPRO_SERVICE_URL: isProduction
    ? urlSchema
    : urlSchema.default("http://localhost:8000"),

  // API key authentication - required in production
  FW_ADMIN_API_KEYS: isProduction
    ? apiKeysSchema
    : apiKeysSchema.default("dev"),

  // CORS configuration
  CORS_ALLOWED_ORIGINS: corsOriginsSchema,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1000)).default("60000"),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default("100"),

  // Request limits
  BODY_SIZE_LIMIT: z.string().regex(/^\d+(kb|mb|gb)?$/i).default("1mb"),

  // Shutdown configuration
  SHUTDOWN_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1000)).default("10000"),

  // Azure Container App Management (optional — for document processor start/stop)
  AZURE_SUBSCRIPTION_ID: z.string().optional(),
  AZURE_RESOURCE_GROUP: z.string().optional(),
  AZURE_CONTAINER_APP_NAME: z.string().optional()
});

// =============================================================================
// CONFIGURATION PARSING & VALIDATION
// =============================================================================

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("[FATAL] Invalid environment configuration:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }

    if (isProduction) {
      console.error("[FATAL] Exiting due to configuration errors in production mode");
      process.exit(1);
    } else {
      console.warn("[WARN] Running with invalid config in development mode - some features may not work");
    }
  }

  const env = result.success ? result.data : envSchema.parse({
    ...process.env,
    // Apply safe defaults for development when validation fails
    FW_ANALYSIS_SERVICE_URL: process.env.FW_ANALYSIS_SERVICE_URL ?? "http://localhost:5050",
    BACKPRO_SERVICE_URL: process.env.BACKPRO_SERVICE_URL ?? "http://localhost:8000",
    FW_ADMIN_API_KEYS: process.env.FW_ADMIN_API_KEYS ?? "dev"
  });

  return {
    /** Server configuration */
    port: env.PORT,
    isProduction,

    /** Upstream service URLs */
    services: {
      fwAnalysis: env.FW_ANALYSIS_SERVICE_URL,
      backpro: env.BACKPRO_SERVICE_URL
    },

    /** API key authentication */
    apiKeys: env.FW_ADMIN_API_KEYS,

    /** CORS configuration */
    cors: {
      origins: env.CORS_ALLOWED_ORIGINS
    },

    /** Rate limiting configuration */
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS
    },

    /** Request body size limit */
    bodyLimit: env.BODY_SIZE_LIMIT,

    /** Graceful shutdown timeout (ms) */
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS
  };
}

export const config = loadConfig();
