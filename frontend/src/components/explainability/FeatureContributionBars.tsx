// components/explainability/FeatureContributionBars.tsx
import { motion } from "framer-motion";
import type { TopFeature } from "@/types/api";

export function FeatureContributionBars({ features }: { features: TopFeature[] }) {
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.shap_value)), 0.001);

  return (
    <div className="space-y-3">
      {features.map((f, i) => {
        const widthPct = (Math.abs(f.shap_value) / maxAbs) * 100;
        const isFraudDirection = f.direction === "toward_fraud";

        return (
          <motion.div
            key={f.feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#111111]">{f.feature}</span>
              <span className={isFraudDirection ? "text-red-600" : "text-green-600"}>
                {f.shap_value > 0 ? "+" : ""}
                {f.shap_value.toFixed(3)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 + 0.1, ease: "easeOut" }}
                className={`h-full rounded-full ${isFraudDirection ? "bg-red-500" : "bg-green-500"}`}
              />
            </div>
            <span className="mt-0.5 block text-xs text-gray-400">
              Observed value: {f.feature_value.toFixed(3)} · {isFraudDirection ? "raises" : "lowers"} fraud likelihood
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
