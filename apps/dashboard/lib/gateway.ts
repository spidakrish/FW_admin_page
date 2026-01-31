import { cache } from "react";
import { createGatewayClient } from "@fw-admin/api-client";
import { serviceUrls } from "./config";

type GatewayHealth = {
  status: string;
  timestamp: string;
  version: string;
};

const client = createGatewayClient({
  baseUrl: serviceUrls.apiGateway
});

export const getGatewayHealth = cache(async (): Promise<GatewayHealth | null> => {
  try {
    const response = await client.health();
    return response;
  } catch (error) {
    console.error("Gateway health check failed", error);
    return null;
  }
});
