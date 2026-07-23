// components/prediction/ScanningAnimation.tsx
import { motion } from "framer-motion";
import { ShieldQuestion } from "lucide-react";

/**
 * Shown while a prediction request is in flight. A sweeping scan-line over
 * a card + pulsing rings around a shield icon -- gives the (accurate!)
 * impression that real analysis is happening (model inference, SHAP
 * computation, LLM narrative generation all genuinely run server-side
 * during this window), rather than a generic spinner.
 */
export function ScanningAnimation() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-10">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border border-[#0f1b3d]/30"
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
            />
          ))}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f1b3d]">
            <ShieldQuestion className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-[#111111]">Analyzing transaction...</p>
          <p className="mt-1 text-xs text-gray-400">
            Scoring with XGBoost, computing SHAP attribution, generating narrative
          </p>
        </div>
      </div>

      {/* Sweeping scan line across the card */}
      <motion.div
        className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-[#0f1b3d]/[0.04] to-transparent"
        initial={{ top: "-20%" }}
        animate={{ top: "120%" }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
