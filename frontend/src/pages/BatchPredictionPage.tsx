// pages/BatchPredictionPage.tsx
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileWarning, Download, AlertTriangle } from "lucide-react";
import { predictionService } from "@/services/predictionService";
import { Button } from "@/components/shared/Button";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { StatCard } from "@/components/shared/Card";
import { LoadingState } from "@/components/shared/States";
import type { BatchUploadResult } from "@/types/api";

export function BatchPredictionPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BatchUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    setError(null);
    setResult(null);
    setFileName(file.name);
    setIsUploading(true);
    try {
      const res = await predictionService.predictBatchCsv(file);
      setResult(res);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Upload failed. Make sure the CSV has columns: Time, V1..V28, Amount."
      );
    } finally {
      setIsUploading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  function exportResultsCsv() {
    if (!result) return;
    const header = "transaction_id,fraud_probability,is_fraud_predicted,model_version,created_at";
    const rows = result.results.map(
      (r) => `${r.transaction_id},${r.fraud_probability},${r.is_fraud_predicted},${r.model_version},${r.created_at}`
    );
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fedxplain-batch-${result.batch_id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const safeCount = result ? result.total_rows - result.flagged_fraud_count : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#111111]">Batch Prediction</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV of transactions to score them all at once against the active model.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
          isDragging ? "border-[#0f1b3d] bg-[#0f1b3d]/[0.03]" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <UploadCloud className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-[#111111]">
          {fileName ?? "Drag and drop a CSV file, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Required columns: Time, V1–V28, Amount (28 anonymized features, no personal data)
        </p>
      </div>

      {isUploading && <LoadingState label="Scoring transactions..." />}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Rows Uploaded" value={result.total_rows} />
            <StatCard label="Fraud Cases" value={result.flagged_fraud_count} />
            <StatCard label="Safe Transactions" value={safeCount} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Batch ID: <span className="font-mono text-xs text-gray-400">{result.batch_id}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={exportResultsCsv}>
              <Download className="h-3.5 w-3.5" />
              Export Results CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">Transaction ID</th>
                  <th className="px-4 py-3 font-medium">Fraud Probability</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {result.results.slice(0, 50).map((r) => (
                  <tr key={r.transaction_id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-[#111111]">#{r.transaction_id}</td>
                    <td className="px-4 py-3 text-gray-600">{(r.fraud_probability * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <RiskBadge probability={r.fraud_probability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.results.length > 50 && (
              <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
                Showing first 50 of {result.results.length} rows — export CSV for the full list
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Rows with values far outside the training data's range may produce unreliable scores.
              The model generalizes to new transactions but was not trained on every possible input.
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
