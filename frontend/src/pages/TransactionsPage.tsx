// pages/TransactionsPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpDown } from "lucide-react";
import { auditService } from "@/services/auditService";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { TransactionDrawer } from "@/components/transactions/TransactionDrawer";
import type { TransactionRecord } from "@/types/api";

const PAGE_SIZE = 15;

type SortKey = "created_at" | "fraud_probability";

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [onlyFraud, setOnlyFraud] = useState(false);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transactions", "full", onlyFraud],
    queryFn: () => auditService.getTransactions({ limit: 500, onlyFraud }),
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search.trim()) {
      const q = search.trim();
      rows = rows.filter((t) => t.id.toString().includes(q) || t.model_version.includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "fraud_probability") return (a.fraud_probability - b.fraud_probability) * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });
    return rows;
  }, [data, search, sortKey, sortAsc]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading transactions..." />;
  if (isError) return <ErrorState description="Could not load transactions. You may not have permission (Admin/Auditor only)." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Transactions</h1>
        <p className="mt-1 text-sm text-gray-500">All scored transactions across the system.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by transaction ID or model version..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0f1b3d]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={onlyFraud}
            onChange={(e) => {
              setOnlyFraud(e.target.checked);
              setPage(0);
            }}
            className="rounded border-gray-300"
          />
          Fraud only
        </label>
      </div>

      {paginated.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">
                    <button onClick={() => toggleSort("fraud_probability")} className="flex items-center gap-1">
                      Fraud Probability <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Model Version</th>
                  <th className="px-4 py-3 font-medium">
                    <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1">
                      Scored At <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-[#111111]">#{t.id}</td>
                    <td className="px-4 py-3 text-gray-600">{(t.fraud_probability * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <RiskBadge probability={t.fraud_probability} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.model_version}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <TransactionDrawer transaction={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
