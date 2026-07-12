// components/shared/Card.tsx
import type { ReactNode } from "react";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {icon}
      </div>
      <span className="font-display text-3xl font-semibold text-[#111111]">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </Card>
  );
}
