// layouts/PublicLayout.tsx
import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main>{children}</main>
      <footer className="border-t border-gray-100 px-6 py-10 text-center text-sm text-gray-400 lg:px-12">
        © {new Date().getFullYear()} FedXplain — Federated, Explainable Fraud Detection.
      </footer>
    </div>
  );
}
