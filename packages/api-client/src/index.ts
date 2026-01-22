import { z } from "zod";

const GatewayResponseSchema = z.object({
  status: z.string(),
  data: z.unknown().optional()
});

export type GatewayResponse = z.infer<typeof GatewayResponseSchema>;

export interface GatewayClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export function createGatewayClient(options: GatewayClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-fw-admin-key": options.apiKey ?? "dev",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error(`Gateway error ${response.status}`);
    }

    const json = await response.json();
    const parsed = GatewayResponseSchema.parse(json);
    return parsed.data as T;
  }

  return {
    health: () => request<{ services: Record<string, string> }>("/api/v1/health"),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: "POST",
        body: JSON.stringify(body)
      })
  };
}
