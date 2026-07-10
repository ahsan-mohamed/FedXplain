// components/shared/RiskBadge.tsx
import { riskLevelFromProbability, type RiskLevel } from "@/types/api";

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "Low Risk", className: "bg-green-50 text-green-700 border-green-200" },
  medium: { label: "Medium Risk", className: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "High Risk", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "Critical Risk", className: "bg-red-50 text-red-800 border-red-300" },
};

export function RiskBadge({ probability }: { probability: number }) {
  const level = riskLevelFromProbability(probability);
  const config = RISK_CONFIG[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
