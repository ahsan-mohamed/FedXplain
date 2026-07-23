// components/shared/IntroSplash.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "fedxplain_intro_shown";

export function IntroSplash() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown) return;

    setIsVisible(true);
    sessionStorage.setItem(SESSION_KEY, "1");

    const timer = setTimeout(() => setIsVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1b3d]"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.svg
              width="72"
              height="72"
              viewBox="0 0 48 48"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.rect
                width="48"
                height="48"
                rx="11"
                fill="white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.path
                d="M16 12h18v5.4H22.2v7.2H32v5.4H22.2V36H16z"
                fill="#0f1b3d"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              />
            </motion.svg>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="font-display text-lg font-medium tracking-wide text-white"
            >
              FedXplain
            </motion.div>

            {/* Thin animated progress line -- gives a sense of "loading the model" */}
            <motion.div className="h-[2px] w-32 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full bg-white"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ delay: 0.7, duration: 0.7, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
