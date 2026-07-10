// components/transactions/TransactionDrawer.tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { Button } from "@/components/shared/Button";
import type { TransactionRecord } from "@/types/api";

export function TransactionDrawer({
  transaction,
  onClose,
}: {
  transaction: TransactionRecord | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {transaction && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#111111]">
                Transaction #{transaction.id}
              </h2>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-50">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-6 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <div>
                <p className="text-xs text-gray-400">Fraud Probability</p>
                <p className="font-display text-2xl font-semibold text-[#111111]">
                  {(transaction.fraud_probability * 100).toFixed(1)}%
                </p>
              </div>
              <RiskBadge probability={transaction.fraud_probability} />
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Amount" value={`$${transaction.features[transaction.features.length - 1]?.toFixed(2) ?? "—"}`} />
              <Row label="Time (elapsed seconds)" value={transaction.features[0]?.toFixed(0) ?? "—"} />
              <Row label="Model Version" value={transaction.model_version} />
              <Row label="Predicted Fraud" value={transaction.is_fraud_predicted ? "Yes" : "No"} />
              <Row label="Batch ID" value={transaction.batch_id ?? "Single prediction"} />
              <Row label="Submitted By (user ID)" value={transaction.submitted_by_id?.toString() ?? "—"} />
              <Row label="Scored At" value={new Date(transaction.created_at).toLocaleString()} />
            </div>

            <Button
              variant="secondary"
              className="mt-6 w-full"
              onClick={() => navigate(`/portal/explainability?txn=${transaction.id}`)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Explanation
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-[#111111]">{value}</span>
    </div>
  );
}
