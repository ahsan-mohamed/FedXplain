// services/predictionService.ts
import { apiClient } from "./client";
import type {
  TransactionInput,
  PredictionResult,
  BatchUploadResult,
  PredictExplainedResult,
} from "@/types/api";

export const predictionService = {
  async predict(payload: TransactionInput): Promise<PredictionResult> {
    const { data } = await apiClient.post<PredictionResult>("/predict", payload);
    return data;
  },

  async predictExplained(payload: TransactionInput): Promise<PredictExplainedResult> {
    const { data } = await apiClient.post<PredictExplainedResult>("/predict/explained", payload);
    return data;
  },

  async predictBatchCsv(file: File): Promise<BatchUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<BatchUploadResult>("/predict/batch-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
