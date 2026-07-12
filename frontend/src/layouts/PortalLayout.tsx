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
    <div className="flex h-screen bg-[#fafafa]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
        <Outlet />
      </main>
      <FraudAlertToasts alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
