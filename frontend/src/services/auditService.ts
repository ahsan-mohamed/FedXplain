// services/auditService.ts
import { apiClient } from "./client";
import type { AuditLogEntry, TransactionRecord } from "@/types/api";

export const auditService = {
  async getLogs(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    const { data } = await apiClient.get<AuditLogEntry[]>("/audit/logs", {
      params: { limit, offset },
    });
    return data;
  },

  async getTransactions(opts: { limit?: number; offset?: number; onlyFraud?: boolean } = {}): Promise<TransactionRecord[]> {
    const { limit = 100, offset = 0, onlyFraud = false } = opts;
    const { data } = await apiClient.get<TransactionRecord[]>("/audit/transactions", {
      params: { limit, offset, only_fraud: onlyFraud },
    });
    return data;
  },
};
