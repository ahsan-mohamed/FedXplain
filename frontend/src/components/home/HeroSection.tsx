// components/home/HeroSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { HeroBackground } from "@/components/home/HeroBackground";

export function HeroSection() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function handleTryDemo() {
    setIsDemoLoading(true);
    try {
      await loginDemo();
      navigate("/portal/dashboard");
    } catch {
      setIsDemoLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <HeroBackground />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-6 text-sm font-medium uppercase tracking-[0.2em] text-gray-400"
      >
        Federated Learning · Explainable AI · LLM Reasoning
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display relative z-10 text-6xl font-semibold leading-[1.05] tracking-tight text-[#111111] sm:text-7xl lg:text-8xl"
      >
        FedXplain
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="font-display relative z-10 mt-6 text-3xl font-medium leading-tight text-[#111111] sm:text-4xl"
      >
        Federated Intelligence.
        <br />
        Transparent Decisions.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="relative z-10 mt-6 max-w-xl text-lg text-gray-500"
      >
        AI-powered financial fraud detection using federated learning,
        explainable AI, and large language models — built to catch fraud
        without banks ever sharing raw customer data.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.55 }}
        className="relative z-10 mt-10 flex flex-col gap-4 sm:flex-row"
      >
        <button
          onClick={handleTryDemo}
          disabled={isDemoLoading}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#0f1b3d] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#1e2f5c] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {isDemoLoading ? "Starting demo..." : "Try it out — no signup needed"}
        </button>
        <a
          href="#technology"
          className="group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-7 py-3.5 text-sm font-medium text-[#111111] transition hover:border-gray-400"
        >
          Explore Platform
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </a>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        onClick={() => navigate("/login")}
        className="relative z-10 mt-5 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
      >
        or sign in with an account
      </motion.button>
    </section>
  );
}
