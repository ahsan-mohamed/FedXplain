// components/layout/Sidebar.tsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Activity, Receipt, Sparkles, Boxes, ScrollText,
  Settings, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  { label: "Transactions", to: "/portal/transactions", icon: Receipt, roles: ["admin", "auditor"] },
  { label: "Explainability", to: "/portal/explainability", icon: Sparkles },
  { label: "Models", to: "/portal/models", icon: Boxes },
  { label: "Audit Logs", to: "/portal/audit", icon: ScrollText, roles: ["admin", "auditor"] },
  { label: "Settings", to: "/portal/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { email, role, hasRole, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles));

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex h-screen flex-col border-r border-gray-100 bg-white"
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

      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
    </motion.aside>
  );
}
