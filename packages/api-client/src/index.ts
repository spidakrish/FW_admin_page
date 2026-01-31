import { z } from "zod";

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Base gateway response schema for all API responses.
 */
const GatewayResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().optional(),
  version: z.string().optional()
});

/**
 * Health check response schema.
 */
const HealthResponseSchema = GatewayResponseSchema.extend({
  status: z.literal("ok"),
  timestamp: z.string(),
  version: z.string()
});

/**
 * Error response schema.
 */
const ErrorResponseSchema = z.object({
  status: z.literal("error"),
  code: z.string(),
  message: z.string()
});

export type GatewayResponse = z.infer<typeof GatewayResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// =============================================================================
// CLIENT ERRORS
// =============================================================================

/**
 * Custom error class for gateway API errors.
 */
export class GatewayError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

/**
 * Error thrown when API key is not configured.
 */
export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "API key is required. Pass apiKey option to createGatewayClient() or set NEXT_PUBLIC_API_KEY environment variable."
    );
    this.name = "MissingApiKeyError";
  }
}

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export interface GatewayClientOptions {
  /** Base URL for the API gateway */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Whether to require API key (default: true in production) */
  requireApiKey?: boolean;
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Creates a typed client for the FW Admin API Gateway.
 *
 * @example
 * ```ts
 * const client = createGatewayClient({
 *   baseUrl: "https://api.example.com",
 *   apiKey: process.env.API_KEY
 * });
 *
 * const health = await client.health();
 * ```
 */
export function createGatewayClient(options: GatewayClientOptions = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  const apiKey = options.apiKey ?? process.env.NEXT_PUBLIC_API_KEY;
  const requireApiKey = options.requireApiKey ?? isProduction;

  // Validate API key configuration
  if (requireApiKey && !apiKey) {
    throw new MissingApiKeyError();
  }

  /**
   * Makes an authenticated request to the gateway.
   */
  async function request<T>(
    path: string,
    init?: RequestInit,
    schema?: z.ZodType<T>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {})
    };

    // Only add API key header if configured
    if (apiKey) {
      headers["x-fw-admin-key"] = apiKey;
    }

    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers
    });

    const json = await response.json();

    // Handle error responses
    if (!response.ok) {
      const errorResult = ErrorResponseSchema.safeParse(json);
      if (errorResult.success) {
        throw new GatewayError(
          response.status,
          errorResult.data.code,
          errorResult.data.message
        );
      }
      throw new GatewayError(
        response.status,
        "UNKNOWN_ERROR",
        `Gateway error: ${response.status}`
      );
    }

    // Validate response with schema if provided
    if (schema) {
      return schema.parse(json);
    }

    // Return raw response (type assertion required when no schema provided)
    return json as T;
  }

  return {
    /**
     * Checks gateway health status.
     * Returns validated health response.
     */
    health: () => request("/api/v1/health", undefined, HealthResponseSchema),

    /**
     * Makes a POST request to the gateway.
     * @param path - API path
     * @param body - Request body
     * @param schema - Optional Zod schema for response validation
     */
    post: <T>(path: string, body: unknown, schema?: z.ZodType<T>) =>
      request<T>(
        path,
        {
          method: "POST",
          body: JSON.stringify(body)
        },
        schema
      ),

    /**
     * Makes a GET request to the gateway.
     * @param path - API path
     * @param schema - Optional Zod schema for response validation
     */
    get: <T>(path: string, schema?: z.ZodType<T>) =>
      request<T>(path, { method: "GET" }, schema)
  };
}
