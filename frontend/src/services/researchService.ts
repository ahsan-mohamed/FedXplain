// services/researchService.ts
import { apiClient } from "./client";

export interface ApproachMetrics {
  name: string;
  description: string;
  accuracy: number | null;
  f1: number | null;
  auc: number | null;
  privacy_preserving: boolean;
}

export interface ResearchComparison {
  approaches: ApproachMetrics[];
  federated_rounds: number;
}

export const researchService = {
  async getComparison(): Promise<ResearchComparison> {
    const { data } = await apiClient.get<ResearchComparison>("/research/comparison");
    return data;
  },
};
