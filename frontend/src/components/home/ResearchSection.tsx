// components/home/ResearchSection.tsx
import { motion } from "framer-motion";

export function ResearchSection() {
  return (
    <section id="research" className="mx-auto max-w-4xl px-6 py-32">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="font-display mb-8 text-center text-4xl font-semibold text-[#111111]"
      >
        Research foundation
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center text-gray-500"
      >
        Grounded in a systematic review of 141 papers on AI-driven fraud
        detection (Sarna et al., IEEE Access, 2025), which identified
        federated learning and explainable AI integration as an open
        research gap — this project directly addresses it.
      </motion.p>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="border-t border-gray-100 px-6 py-32 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="font-display mb-4 text-4xl font-semibold text-[#111111]"
      >
        Get in touch
      </motion.h2>
      <p className="text-gray-500">Final-year project — built on federated learning and explainable AI research.</p>
    </section>
  );
}
