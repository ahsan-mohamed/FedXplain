// components/shared/FraudAlertToasts.tsx
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import type { FraudAlertMessage } from "@/hooks/useFraudAlerts";

export function FraudAlertToasts({
  alerts,
  onDismiss,
}: {
  alerts: FraudAlertMessage[];
  onDismiss: (transactionId: number) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.transaction_id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex w-80 items-start gap-3 rounded-2xl border border-red-100 bg-white p-4 shadow-lg"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50"
            >
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#111111]">High-risk transaction flagged</p>
              <p className="mt-0.5 text-xs text-gray-500">{alert.message}</p>
              <button
                onClick={() => {
                  navigate(`/portal/explainability?txn=${alert.transaction_id}`);
                  onDismiss(alert.transaction_id);
                }}
                className="mt-2 text-xs font-medium text-[#0f1b3d] hover:underline"
              >
                View details
              </button>
            </div>
            <button
              onClick={() => onDismiss(alert.transaction_id)}
              className="text-gray-300 transition hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
