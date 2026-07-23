// layouts/PortalLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useFraudAlerts } from "@/hooks/useFraudAlerts";
import { FraudAlertToasts } from "@/components/shared/FraudAlertToasts";

export function PortalLayout() {
  const { isAuthenticated } = useAuth();
  const { alerts, dismissAlert } = useFraudAlerts(isAuthenticated);
  const location = useLocation();

  return (
    // flex-col on mobile so the top bar (inside Sidebar's MobileNav) spans
    // full width above the content; flex-row on lg+ for the classic
    // sidebar-beside-content desktop layout.
    <div className="flex h-screen flex-col bg-[#fafafa] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <FraudAlertToasts alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
