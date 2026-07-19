// pages/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ShieldAlert, Boxes, HeartPulse } from "lucide-react";
import { healthService } from "@/services/healthService";
import { auditService } from "@/services/auditService";
import { predictionService } from "@/services/predictionService";
import { StatCard } from "@/components/shared/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const RISK_COLORS = ["#16a34a", "#d97706", "#ea580c", "#b91c1c"];

function RecentPredictionsWidget() {
  const { hasRole } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["recent-predictions"],
    queryFn: () => predictionService.getRecentPredictions(5),
  });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#111111]">Recent Predictions</span>
        <span className="text-xs text-gray-400">
          {hasRole("admin", "auditor") ? "System-wide" : "Your submissions"}
        </span>
      </div>

      {isLoading && <LoadingState label="Loading..." />}
      {isError && <ErrorState description="Could not load recent predictions." />}

      {data && data.length === 0 && (
        <EmptyState
          title="No predictions yet"
          description="Score a transaction on the Predictions page to see it here."
        />
      )}

      {data && data.length > 0 && (
        <div className="divide-y divide-gray-50">
          {data.map((p) => (
            <Link
              key={p.transaction_id}
              to={`/portal/explainability?txn=${p.transaction_id}`}
              className="flex items-center justify-between py-2.5 transition hover:bg-gray-50/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#111111]">#{p.transaction_id}</span>
                <span className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{(p.fraud_probability * 100).toFixed(1)}%</span>
                <RiskBadge probability={p.fraud_probability} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { hasRole } = useAuth();
  const canSeeTransactions = hasRole("admin", "auditor");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: healthService.check,
    refetchInterval: 15000,
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", "dashboard"],
    queryFn: () => auditService.getTransactions({ limit: 100 }),
    enabled: canSeeTransactions,
  });

  if (healthQuery.isLoading) return <LoadingState label="Loading dashboard..." />;
  if (healthQuery.isError) return <ErrorState description="Could not reach the backend. Is it running?" />;

  const transactions = transactionsQuery.data ?? [];
  const fraudCount = transactions.filter((t) => t.is_fraud_predicted).length;
  const criticalCount = transactions.filter((t) => t.fraud_probability >= 0.85).length;

  const riskBuckets = [
    { name: "Low", value: transactions.filter((t) => t.fraud_probability < 0.2).length },
    { name: "Medium", value: transactions.filter((t) => t.fraud_probability >= 0.2 && t.fraud_probability < 0.5).length },
    { name: "High", value: transactions.filter((t) => t.fraud_probability >= 0.5 && t.fraud_probability < 0.85).length },
    { name: "Critical", value: transactions.filter((t) => t.fraud_probability >= 0.85).length },
  ];

  const trendData = transactions
    .slice()
    .reverse()
    .map((t, i) => ({ index: i, probability: t.fraud_probability }));

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Real-time overview of fraud detection activity.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Transactions Scored"
          value={transactions.length}
          icon={<Activity className="h-4 w-4 text-gray-400" />}
          hint={canSeeTransactions ? "Last 100 records" : "Restricted for your role"}
        />
        <StatCard
          label="Fraud Alerts"
          value={fraudCount}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Critical Alerts"
          value={criticalCount}
          icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
        />
        <StatCard
          label="Active Model"
          value={healthQuery.data?.active_model_version ?? "None"}
          icon={<Boxes className="h-4 w-4 text-gray-400" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className={`h-4 w-4 ${healthQuery.data?.status === "ok" ? "text-green-600" : "text-red-600"}`} />
            <span className="text-sm font-medium text-[#111111]">System Health</span>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Backend</span>
              <span className="font-medium text-green-600">{healthQuery.data?.status ?? "unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>Model Loaded</span>
              <span className={`font-medium ${healthQuery.data?.model_loaded ? "text-green-600" : "text-red-600"}`}>
                {healthQuery.data?.model_loaded ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        <RecentPredictionsWidget />

        {canSeeTransactions && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <span className="mb-3 block text-sm font-medium text-[#111111]">Risk Distribution</span>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={riskBuckets} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65}>
                  {riskBuckets.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {canSeeTransactions && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <span className="mb-3 block text-sm font-medium text-[#111111]">Fraud Trend</span>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="index" hide />
                <YAxis domain={[0, 1]} hide />
                <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                <Line type="monotone" dataKey="probability" stroke="#0f1b3d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {riskBuckets.some((b) => b.value > 0) && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <span className="mb-3 block text-sm font-medium text-[#111111]">Transaction Volume by Risk Band</span>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={riskBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {riskBuckets.map((_, i) => (
                      <Cell key={i} fill={RISK_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
