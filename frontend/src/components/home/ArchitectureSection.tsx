// components/home/ArchitectureSection.tsx
import { motion } from "framer-motion";
import { AnimatedFlowDiagram } from "@/components/home/AnimatedFlowDiagram";

const LAYERS = [
  { name: "Simulated Banks", detail: "5 institutions, non-IID data, FedAvg aggregation" },
  { name: "Production Scoring Engine", detail: "XGBoost, trained centrally for higher accuracy" },
  { name: "Explainability Layer", detail: "SHAP TreeExplainer + Groq LLaMA 3.3 70B narratives" },
  { name: "API & Access Control", detail: "FastAPI, JWT auth, role-based access (Admin / Analyst / Auditor)" },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="border-t border-gray-100 bg-[#fafafa] px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="font-display mb-12 text-center text-4xl font-semibold text-[#111111]"
        >
          Architecture
        </motion.h2>

        <AnimatedFlowDiagram />

        <div className="space-y-4">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-center gap-6 rounded-2xl border border-gray-100 bg-white px-6 py-5"
            >
              <span className="font-display text-sm font-medium text-gray-300">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium text-[#111111]">{layer.name}</p>
                <p className="text-sm text-gray-500">{layer.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
