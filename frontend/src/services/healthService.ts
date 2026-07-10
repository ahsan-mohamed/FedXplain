// services/healthService.ts
import { apiClient } from "./client";
import type { HealthCheckResponse } from "@/types/api";

export const healthService = {
  async check(): Promise<HealthCheckResponse> {
    const { data } = await apiClient.get<HealthCheckResponse>("/health");
    return data;
  },
};
