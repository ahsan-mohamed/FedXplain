// layouts/PortalLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useFraudAlerts } from "@/hooks/useFraudAlerts";
import { FraudAlertToasts } from "@/components/shared/FraudAlertToasts";

export function PortalLayout() {
  const { isAuthenticated } = useAuth();
  const { alerts, dismissAlert } = useFraudAlerts(isAuthenticated);

  return (
    // flex-col on mobile so the top bar (inside Sidebar's MobileNav) spans
    // full width above the content; flex-row on lg+ for the classic
    // sidebar-beside-content desktop layout.
    <div className="flex h-screen flex-col bg-[#fafafa] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <Outlet />
      </main>
      <FraudAlertToasts alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
