// components/shared/States.tsx
import type { ReactNode } from "react";
import { Inbox, AlertTriangle, Loader2 } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Inbox className="h-8 w-8 text-gray-300" />
      <span className="font-display text-lg font-medium text-[#111111]">{title}</span>
      {description && <span className="max-w-sm text-sm text-gray-400">{description}</span>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <span className="font-display text-lg font-medium text-[#111111]">{title}</span>
      {description && <span className="max-w-sm text-sm text-gray-400">{description}</span>}
    </div>
  );
}

export function Toast({ message, type = "info" }: { message: string; type?: "info" | "success" | "error"; children?: ReactNode }) {
  const colors = {
    info: "bg-gray-900 text-white",
    success: "bg-green-700 text-white",
    error: "bg-red-700 text-white",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm shadow-lg ${colors[type]}`}>
      {message}
    </div>
  );
}
