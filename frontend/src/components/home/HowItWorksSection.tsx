// components/home/HowItWorksSection.tsx
import { motion } from "framer-motion";
import { Network, ShieldCheck, MessageSquareText } from "lucide-react";

const STEPS = [
  {
    icon: Network,
    title: "Federated Learning",
    description:
      "Multiple simulated banks train a shared fraud model collaboratively via FedAvg — raw transaction data never leaves any single institution.",
  },
  {
    icon: ShieldCheck,
    title: "Explainable AI",
    description:
      "Every flagged transaction gets a SHAP-based feature attribution, so analysts see exactly which signals drove a fraud decision — no black box.",
  },
  {
    icon: MessageSquareText,
    title: "LLM Reasoning",
    description:
      "Plain-English narratives for analysts, and formal Basel III-style audit narratives for compliance — generated automatically from the model's own reasoning.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="technology" className="mx-auto max-w-6xl px-6 py-32">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="font-display mb-16 text-center text-4xl font-semibold text-[#111111]"
      >
        How it works
      </motion.h2>

      <div className="grid gap-12 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
            className="flex flex-col items-start gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f1b3d]/5">
              <step.icon className="h-6 w-6 text-[#0f1b3d]" />
            </div>
            <h3 className="font-display text-xl font-medium text-[#111111]">{step.title}</h3>
            <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
