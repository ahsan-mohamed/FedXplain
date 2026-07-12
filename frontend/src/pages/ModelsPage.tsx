// pages/ModelsPage.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Boxes, ShieldCheck, ShieldOff } from "lucide-react";
import { modelService } from "@/services/modelService";
import { researchService } from "@/services/researchService";
import { Button } from "@/components/shared/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

function ResearchComparisonSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["research-comparison"],
    queryFn: researchService.getComparison,
  });

  if (isLoading) return <LoadingState label="Loading research comparison..." />;
  if (isError || !data || data.approaches.length === 0) return null; // silently omit if nothing generated yet

  const chartData = data.approaches.map((a) => ({
    name: a.name,
    Accuracy: a.accuracy ? Number((a.accuracy * 100).toFixed(2)) : null,
    F1: a.f1 ? Number((a.f1 * 100).toFixed(2)) : null,
    AUC: a.auc ? Number((a.auc * 100).toFixed(2)) : null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-[#111111]">Research Comparison</h2>
        <p className="mt-1 text-sm text-gray-500">
          How federated learning compares against isolated and centralized training —
          the core privacy-vs-performance tradeoff this project investigates.
          {data.federated_rounds > 0 && ` Federated model trained over ${data.federated_rounds} rounds.`}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Accuracy" fill="#0f1b3d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="F1" fill="#4F81BD" radius={[4, 4, 0, 0]} />
            <Bar dataKey="AUC" fill="#9BBB59" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.approaches.map((a) => (
          <div key={a.name} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
            {a.privacy_preserving ? (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium text-[#111111]">{a.name}</p>
              <p className="text-xs text-gray-400">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModelsPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [activatingTag, setActivatingTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["model-versions"],
    queryFn: modelService.listVersions,
  });

  async function handleActivate(versionTag: string) {
    setActivatingTag(versionTag);
    setError(null);
    try {
      await modelService.activateVersion(versionTag);
      await queryClient.invalidateQueries({ queryKey: ["model-versions"] });
    } catch {
      setError(`Failed to activate ${versionTag}. Admin role required.`);
    } finally {
      setActivatingTag(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading model versions..." />;
  if (isError) return <ErrorState description="Could not load model versions." />;

  const versions = data ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Models</h1>
        <p className="mt-1 text-sm text-gray-500">
          Trained model versions. Only one can be active at a time — it serves all live predictions.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {versions.length === 0 ? (
        <EmptyState
          title="No model versions registered"
          description="Run evaluation/train_xgboost.py and app/bootstrap_model.py on the backend first."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((v, i) => (
            <motion.div
              key={v.version_tag}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`rounded-2xl border p-6 ${
                v.is_active ? "border-[#0f1b3d] bg-[#0f1b3d]/[0.02]" : "border-gray-100 bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-gray-400" />
                  <span className="font-display font-semibold text-[#111111]">{v.version_tag}</span>
                </div>
                {v.is_active && (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-sm text-gray-500">
                {v.metrics &&
                  Object.entries(v.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium text-[#111111]">
                        {typeof value === "number" ? value.toFixed(4) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Trained {new Date(v.created_at).toLocaleDateString()}
              </p>

              {!v.is_active && hasRole("admin") && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-4 w-full"
                  isLoading={activatingTag === v.version_tag}
                  onClick={() => handleActivate(v.version_tag)}
                >
                  Activate
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <ResearchComparisonSection />
    </div>
  );
}
