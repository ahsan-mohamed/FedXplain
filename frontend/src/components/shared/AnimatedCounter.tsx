// components/shared/AnimatedCounter.tsx
import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.2,
  decimals = 0,
  suffix = "",
  prefix = "",
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) =>
    decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString()
  );
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // smooth "ease-out-expo" feel
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = `${prefix}${latest}${suffix}`;
      }
    });
    return unsubscribe;
  }, [rounded, prefix, suffix]);

  return (
    <motion.span
      ref={nodeRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}0{suffix}
    </motion.span>
  );
}
