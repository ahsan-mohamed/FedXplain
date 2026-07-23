// pages/PredictionsPage.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { predictionService } from "@/services/predictionService";
import { Button } from "@/components/shared/Button";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { FeatureContributionBars } from "@/components/explainability/FeatureContributionBars";
import { ScanningAnimation } from "@/components/prediction/ScanningAnimation";
import {
  generateTypicalTransaction,
  generateSuspiciousTransaction,
  generateRandomTransaction,
  type SampleTransaction,
} from "@/utils/sampleTransactions";
import type { PredictExplainedResult } from "@/types/api";

export function PredictionsPage() {
  const [current, setCurrent] = useState<SampleTransaction>(generateTypicalTransaction());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<PredictExplainedResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function regenerate(kind: "typical" | "suspicious" | "random") {
    const generators = {
      typical: generateTypicalTransaction,
      suspicious: generateSuspiciousTransaction,
      random: generateRandomTransaction,
    };
    setCurrent(generators[kind]());
    setResult(null);
    setError(null);
  }

  function updateVFeature(index: number, value: number) {
    const newV = [...current.V];
    newV[index] = value;
    setCurrent({ ...current, V: newV });
  }

  async function handlePredict() {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await predictionService.predictExplained({
        Time: current.Time,
        V: current.V,
        Amount: current.Amount,
      });
      setResult(res);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Prediction failed. Is the model trained and active?");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Predictions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Score a transaction against the active fraud detection model.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-medium text-[#111111]">Transaction input</span>
          <span className="text-xs text-gray-400">{current.label}</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => regenerate("typical")}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-400"
          >
            <RefreshCw className="mr-1.5 inline h-3 w-3" />
            Typical transaction
          </button>
          <button
            onClick={() => regenerate("suspicious")}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-400"
          >
            <RefreshCw className="mr-1.5 inline h-3 w-3" />
            Suspicious pattern
          </button>
          <button
            onClick={() => regenerate("random")}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-400"
          >
            <RefreshCw className="mr-1.5 inline h-3 w-3" />
            Fully random
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Amount ($)</label>
            <input
              type="number"
              value={current.Amount}
              onChange={(e) => setCurrent({ ...current, Amount: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0f1b3d]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Time (seconds elapsed)</label>
            <input
              type="number"
              value={current.Time}
              onChange={(e) => setCurrent({ ...current, Time: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0f1b3d]"
            />
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="mt-4 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
        >
          {showAdvanced ? "Hide" : "Show"} raw model features (V1–V28)
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-gray-50 p-4 sm:grid-cols-7">
                {current.V.map((val, i) => (
                  <div key={i}>
                    <label className="block text-[10px] text-gray-400">V{i + 1}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={val}
                      onChange={(e) => updateVFeature(i, Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-1.5 py-1 text-xs outline-none focus:border-[#0f1b3d]"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                These are the anonymized, PCA-transformed features the real model was trained on
                (no cardholder, merchant, or location data exists in this dataset by design).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button onClick={handlePredict} isLoading={isSubmitting} className="mt-6 w-full">
          <Sparkles className="h-4 w-4" />
          Predict &amp; Explain
        </Button>
      </div>

      {isSubmitting && <ScanningAnimation />}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Stage 1: Fraud Score */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Fraud Probability</span>
                  <p className="font-display text-4xl font-semibold text-[#111111]">
                    {(result.fraud_probability * 100).toFixed(1)}%
                  </p>
                </div>
                <RiskBadge probability={result.fraud_probability} />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Model version: {result.model_version} · Transaction #{result.transaction_id}
              </p>
            </motion.div>

            {/* Stage 2: Feature Importance */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <span className="mb-4 block text-sm font-medium text-[#111111]">
                Top contributing features (SHAP)
              </span>
              <FeatureContributionBars features={result.top_features} />
            </motion.div>

            {/* Stage 3: AI Narrative */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <span className="mb-3 block text-sm font-medium text-[#111111]">
                AI Investigation Narrative
              </span>
              <p className="text-sm leading-relaxed text-gray-600">
                {result.llm_narrative ?? "No narrative available."}
              </p>
            </motion.div>

            {/* Stage 4: Recommended Action */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className={`rounded-2xl border p-6 ${
                result.fraud_probability >= 0.85
                  ? "border-red-200 bg-red-50"
                  : result.fraud_probability >= 0.5
                  ? "border-orange-200 bg-orange-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <span className="mb-1 block text-sm font-medium text-[#111111]">Recommended Action</span>
              <p className="text-sm text-gray-600">
                {result.fraud_probability >= 0.85
                  ? "Escalate for manual review and consider a transaction hold pending verification."
                  : result.fraud_probability >= 0.5
                  ? "Flag for analyst review within standard SLA."
                  : "No action required — monitor as normal."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
