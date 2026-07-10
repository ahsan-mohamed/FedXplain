// services/explainService.ts
import { apiClient } from "./client";
import type { ExplanationOut } from "@/types/api";

export const explainService = {
  async getExplanation(transactionId: number): Promise<ExplanationOut> {
    const { data } = await apiClient.get<ExplanationOut>(`/explain/${transactionId}`);
    return data;
  },

  async getBaselNarrative(transactionId: number): Promise<ExplanationOut> {
    const { data } = await apiClient.get<ExplanationOut>(`/explain/${transactionId}/basel`);
    return data;
  },
};
