// pages/ExplainabilityPage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, FileText } from "lucide-react";
import { explainService } from "@/services/explainService";
import { Button } from "@/components/shared/Button";
import { FeatureContributionBars } from "@/components/explainability/FeatureContributionBars";
import { ErrorState, EmptyState } from "@/components/shared/States";
import type { ExplanationOut } from "@/types/api";
import { useNavigate } from "react-router-dom";

export function ExplainabilityPage() {
  const [txnId, setTxnId] = useState("");
  const [explanation, setExplanation] = useState<ExplanationOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLookup() {
    const id = Number(txnId);
    if (!id || id <= 0) {
      setError("Enter a valid transaction ID.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const result = await explainService.getExplanation(id);
      setExplanation(result);
    } catch {
      setError(`No explanation found for transaction #${id}. Has it been scored yet?`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Explainability</h1>
        <p className="mt-1 text-sm text-gray-500">
          Look up the SHAP-based explanation for any previously scored transaction.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="number"
          value={txnId}
          onChange={(e) => setTxnId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="Transaction ID (e.g. 1)"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0f1b3d]"
        />
        <Button onClick={handleLookup} isLoading={isLoading}>
          <Search className="h-4 w-4" />
          Look up
        </Button>
      </div>

      {error && <ErrorState title="Not found" description={error} />}

      {!explanation && !error && !isLoading && (
        <EmptyState
          title="No explanation loaded"
          description="Score a transaction on the Predictions page, then look it up here by its transaction ID."
        />
      )}

      {explanation && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[#111111]">
                Top contributing features — Transaction #{explanation.transaction_id}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/portal/explainability/${explanation.transaction_id}/basel`)}
              >
                <FileText className="h-3.5 w-3.5" />
                Basel III Report
              </Button>
            </div>
            <FeatureContributionBars features={explanation.top_features} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <span className="mb-3 block text-sm font-medium text-[#111111]">Plain-English Explanation</span>
            <p className="text-sm leading-relaxed text-gray-600">
              {explanation.llm_narrative ?? "No narrative available."}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
