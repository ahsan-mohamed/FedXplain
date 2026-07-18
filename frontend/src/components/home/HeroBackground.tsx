// components/home/HeroBackground.tsx
import { motion } from "framer-motion";

/**
 * Subtle, minimal background for the hero section: a faint dot grid plus a
 * soft radial glow behind the headline. Deliberately restrained -- no heavy
 * gradients, no glassmorphism, no neon -- consistent with the premium
 * editorial design direction (Stripe/Linear/Vercel style backgrounds).
 */
export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Faint dot grid */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 35%, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 35%, black 40%, transparent 90%)",
        }}
      />

      {/* Soft glow behind the headline -- slow, barely-there pulse */}
      <motion.div
        className="absolute left-1/2 top-[30%] h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(15,27,61,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Fade to white at the very bottom of the hero so it blends into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
