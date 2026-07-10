// pages/AuditLogsPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, User, ShieldCheck, LogIn, Upload, Activity } from "lucide-react";
import { auditService } from "@/services/auditService";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";

const PAGE_SIZE = 20;

const ACTION_ICONS: Record<string, typeof User> = {
  LOGIN: LogIn,
  PREDICT: Activity,
  CSV_UPLOAD: Upload,
};

export function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => auditService.getLogs(500, 0),
  });

  const filtered = useMemo(() => {
    let logs = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) => l.action.toLowerCase().includes(q) || l.ip_address?.toLowerCase().includes(q)
      );
    }
    return logs;
  }, [data, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  if (isLoading) return <LoadingState label="Loading audit logs..." />;
  if (isError) return <ErrorState description="Could not load audit logs. Admin/Auditor role required." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Full trail of system activity for compliance review.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by action or IP address..."
          className="w-full max-w-md rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0f1b3d]"
        />
      </div>

      {paginated.length === 0 ? (
        <EmptyState title="No audit logs found" />
      ) : (
        <>
          <div className="relative space-y-0 border-l border-gray-100 pl-6">
            {paginated.map((log, i) => {
              const Icon = ACTION_ICONS[log.action] ?? ShieldCheck;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                  className="relative py-4"
                >
                  <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f1b3d]/5">
                      <Icon className="h-3 w-3 text-[#0f1b3d]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#111111]">{log.action}</span>
                    <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                    {log.user_id && <span>User #{log.user_id}</span>}
                    {log.ip_address && <span>{log.ip_address}</span>}
                  </div>
                  {log.detail && (
                    <pre className="mt-1.5 max-w-lg overflow-x-auto rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                      {JSON.stringify(log.detail)}
                    </pre>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {page + 1} of {totalPages} ({filtered.length} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-gray-200 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-gray-200 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
