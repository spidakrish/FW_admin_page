import { cache } from "react";
import { createGatewayClient } from "@fw-admin/api-client";

type GatewayHealth = {
  services: Record<string, string>;
};

const client = createGatewayClient();

export const getGatewayHealth = cache(async (): Promise<GatewayHealth | null> => {
  try {
    const response = await client.health();
    return response;
  } catch (error) {
    console.error("Gateway health check failed", error);
    return null;
  }
});
