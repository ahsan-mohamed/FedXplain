// types/api.ts
//
// These types mirror app/models/schema.py in the backend EXACTLY.
// Do not add fields here that the backend doesn't actually return/accept --
// see the project README note on why "Merchant", "Country", "Customer Name"
// etc. are NOT real model inputs (the dataset is anonymized: Time, V1-V28,
// Amount only). Any such fields in the UI are cosmetic/illustrative only.

export type Role = "admin" | "fraud_analyst" | "auditor";

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name?: string;
  role: Role;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserOut {
  id: number;
  email: string;
  full_name?: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

// ---------- Prediction ----------

export interface TransactionInput {
  Time: number;
  V: number[]; // exactly 28 values: V1..V28
  Amount: number;
}

export interface PredictionResult {
  transaction_id: number;
  fraud_probability: number;
  is_fraud_predicted: boolean;
  model_version: string;
  created_at: string;
}

export interface BatchUploadResult {
  batch_id: string;
  total_rows: number;
  flagged_fraud_count: number;
  results: PredictionResult[];
}

// ---------- Explainability ----------

export interface TopFeature {
  feature: string;
  shap_value: number;
  feature_value: number;
  direction: "toward_fraud" | "toward_legitimate";
}

export interface ExplanationOut {
  transaction_id: number;
  top_features: TopFeature[];
  llm_narrative: string | null;
  created_at: string;
}

export interface PredictExplainedResult {
  transaction_id: number;
  fraud_probability: number;
  is_fraud_predicted: boolean;
  model_version: string;
  top_features: TopFeature[];
  llm_narrative: string | null;
}

// ---------- Model versioning ----------

export interface ModelVersionOut {
  version_tag: string;
  metrics: Record<string, number> | null;
  is_active: boolean;
  created_at: string;
}

// ---------- Audit ----------

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface TransactionRecord {
  id: number;
  submitted_by_id: number | null;
  features: number[];
  fraud_probability: number;
  is_fraud_predicted: boolean;
  model_version: string;
  batch_id: string | null;
  created_at: string;
}

// ---------- Monitoring ----------

export interface HealthCheckResponse {
  status: string;
  model_loaded: boolean;
  active_model_version: string | null;
}

// ---------- Risk classification (frontend-derived, not from backend) ----------

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function riskLevelFromProbability(prob: number): RiskLevel {
  if (prob >= 0.85) return "critical";
  if (prob >= 0.5) return "high";
  if (prob >= 0.2) return "medium";
  return "low";
}
