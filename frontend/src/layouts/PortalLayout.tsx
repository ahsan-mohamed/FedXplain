// layouts/PortalLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";

export function PortalLayout() {
  return (
    <div className="flex h-screen bg-[#fafafa]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  );
}
