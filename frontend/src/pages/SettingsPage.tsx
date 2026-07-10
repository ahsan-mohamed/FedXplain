// pages/SettingsPage.tsx
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Server, Database, Boxes, MessageSquareText } from "lucide-react";
import { healthService } from "@/services/healthService";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/shared/Card";
import { LoadingState, ErrorState } from "@/components/shared/States";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />;
}

export function SettingsPage() {
  const { email, role } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["health", "settings"],
    queryFn: healthService.check,
    refetchInterval: 10000,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Account details and system status.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <h2 className="mb-4 text-sm font-medium text-[#111111]">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-50 py-2">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-[#111111]">{email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Role</span>
              <span className="font-medium capitalize text-[#111111]">{role?.replace("_", " ")}</span>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <h2 className="mb-4 text-sm font-medium text-[#111111]">System Health</h2>

          {isLoading && <LoadingState label="Checking system health..." />}
          {isError && <ErrorState description="Could not reach the backend." />}

          {data && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-gray-50 py-2">
                <span className="flex items-center gap-2 text-gray-500">
                  <Server className="h-4 w-4" /> Backend
                </span>
                <span className="flex items-center gap-2 font-medium text-[#111111]">
                  <StatusDot ok={data.status === "ok"} />
                  {data.status}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 py-2">
                <span className="flex items-center gap-2 text-gray-500">
                  <Boxes className="h-4 w-4" /> Model
                </span>
                <span className="flex items-center gap-2 font-medium text-[#111111]">
                  <StatusDot ok={data.model_loaded} />
                  {data.model_loaded ? `Loaded (${data.active_model_version})` : "Not loaded"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 py-2">
                <span className="flex items-center gap-2 text-gray-500">
                  <Database className="h-4 w-4" /> Database
                </span>
                <span className="flex items-center gap-2 font-medium text-[#111111]">
                  <StatusDot ok={true} />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-gray-500">
                  <MessageSquareText className="h-4 w-4" /> LLM Narratives
                </span>
                <span className="text-xs text-gray-400">
                  Set GROQ_API_KEY in backend .env to enable — falls back to templates otherwise
                </span>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
