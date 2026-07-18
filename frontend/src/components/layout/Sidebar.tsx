// components/layout/Sidebar.tsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Activity, Receipt, Sparkles, Boxes, ScrollText,
  Settings, ChevronLeft, ChevronRight, LogOut, UploadCloud, Menu, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Attribution } from "@/components/shared/Attribution";
import type { Role } from "@/types/api";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: Role[]; // undefined = visible to all authenticated roles
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Predictions", to: "/portal/predictions", icon: Activity, roles: ["admin", "fraud_analyst"] },
  { label: "Batch Prediction", to: "/portal/batch-prediction", icon: UploadCloud, roles: ["admin", "fraud_analyst"] },
  { label: "Transactions", to: "/portal/transactions", icon: Receipt, roles: ["admin", "auditor"] },
  { label: "Explainability", to: "/portal/explainability", icon: Sparkles },
  { label: "Models", to: "/portal/models", icon: Boxes },
  { label: "Audit Logs", to: "/portal/audit", icon: ScrollText, roles: ["admin", "auditor"] },
  { label: "Settings", to: "/portal/settings", icon: Settings },
];

/** Shared nav list + account footer, reused by both the desktop sidebar
 * and the mobile drawer so behavior/roles logic never drifts between them. */
function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { email, role, hasRole, logout } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles));

  return (
    <>
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-[#0f1b3d] text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#111111]"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-3 py-4">
        {!collapsed && (
          <div className="mb-2 px-3">
            <p className="truncate text-xs font-medium text-[#111111]">{email}</p>
            <p className="text-xs capitalize text-gray-400">{role?.replace("_", " ")}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500 transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>

      {!collapsed && <Attribution variant="sidebar" />}
    </>
  );
}

/** Desktop sidebar: fixed, collapsible, always visible on lg+ screens. */
function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative hidden h-screen flex-col border-r border-gray-100 bg-white lg:flex"
    >
      <div className="flex items-center justify-between px-5 py-6">
        {!collapsed && <span className="font-display text-lg font-semibold text-[#111111]">FedXplain</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-[#111111]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <SidebarContent collapsed={collapsed} />
    </motion.aside>
  );
}

/** Mobile top bar (hamburger) + slide-in drawer, shown only below lg. */
function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 lg:hidden">
        <span className="font-display text-base font-semibold text-[#111111]">FedXplain</span>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-100 bg-white lg:hidden"
            >
              <div className="flex items-center justify-between px-5 py-6">
                <span className="font-display text-lg font-semibold text-[#111111]">FedXplain</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent collapsed={false} onNavigate={() => setIsOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileNav />
    </>
  );
}
