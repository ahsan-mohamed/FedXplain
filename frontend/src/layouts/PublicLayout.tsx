// layouts/PublicLayout.tsx
import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Attribution } from "@/components/shared/Attribution";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main>{children}</main>
      <footer className="space-y-3 border-t border-gray-100 px-6 py-10 text-center lg:px-12">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} FedXplain — Federated, Explainable Fraud Detection.
        </p>
        <Attribution />
      </footer>
    </div>
  );
}
