// services/modelService.ts
import { apiClient } from "./client";
import type { ModelVersionOut } from "@/types/api";

export const modelService = {
  async listVersions(): Promise<ModelVersionOut[]> {
    const { data } = await apiClient.get<ModelVersionOut[]>("/models/versions");
    return data;
  },

  async activateVersion(versionTag: string): Promise<ModelVersionOut> {
    const { data } = await apiClient.post<ModelVersionOut>(`/models/activate/${versionTag}`);
    return data;
  },
};
