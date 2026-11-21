"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import type { UploadBatch, Vehicle } from "@/types/database";

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  completed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Completed", icon: CheckCircle2 },
  failed: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Failed", icon: XCircle },
  processing: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Processing", icon: Clock },
  pending: { bg: "bg-navy-100 border-navy-200", text: "text-navy-700", label: "Pending", icon: Clock },
};

export function UploadedFilesHistory({ refreshKey }: { refreshKey?: number }) {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [previewBatch, setPreviewBatch] = useState<UploadBatch | null>(null);
  const [previewVehicles, setPreviewVehicles] = useState<Vehicle[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [errorsBatch, setErrorsBatch] = useState<UploadBatch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadBatch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/batches?limit=50");
      const data = await res.json();
      if (res.ok) {
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to load upload batches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches, refreshKey]);

  // Download original Excel file
  const handleDownload = async (batch: UploadBatch) => {
    if (!batch.file_path) {
      toast.info("Original file path was not recorded for this legacy upload.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to download file");

      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast.success(`Downloading ${batch.file_name}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  // Preview records imported by batch
  const handleOpenPreview = async (batch: UploadBatch) => {
    setPreviewBatch(batch);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`);
      const data = await res.json();
      if (res.ok) {
        setPreviewVehicles(data.sampleVehicles || []);
      }
    } catch {
      toast.error("Failed to load imported records for this batch");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Delete batch and associated vehicles
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/batches/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete batch");

      toast.success(data.message || "Batch and associated vehicle records deleted.");
      setDeleteTarget(null);
      loadBatches();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBatches = batches.filter((b) =>
    !searchTerm ||
    b.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.uploader_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="enterprise-card border border-navy-200 shadow-sm overflow-hidden">
        {/* Collapsible Header */}
        <div className="px-6 py-4 border-b border-navy-200 bg-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-navy-900 text-sm">Uploaded Excel Files History</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-navy-100 text-navy-800">
                  {batches.length} file{batches.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-navy-500">Track all batch uploads, verify imported records, and download original sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search file name…"
                className="h-8 pl-8 pr-2.5 rounded-lg border border-navy-200 bg-navy-50/50 text-xs text-navy-800 placeholder:text-navy-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            <button
              type="button"
              onClick={() => loadBatches()}
              className="w-8 h-8 rounded-lg border border-navy-200 flex items-center justify-center text-navy-500 hover:bg-navy-50 hover:text-navy-800"
              title="Refresh upload history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Show History</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-navy-100 animate-pulse" />
                ))}
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="py-12 text-center">
                <FileSpreadsheet className="w-10 h-10 text-navy-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-navy-700">No Excel file uploads recorded</p>
                <p className="text-[11px] text-navy-400 mt-0.5">
                  Uploaded files and ingestion histories will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-200 bg-navy-50/70">
                      <th className="text-left px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        Uploaded By
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        Upload Date &amp; Time
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        Records Breakdown
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-5 py-3 font-semibold text-navy-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {filteredBatches.map((b) => {
                      const cfg = statusConfig[b.status] || statusConfig.pending;
                      const StatusIcon = cfg.icon;
                      const hasErrors = Array.isArray(b.errors) && b.errors.length > 0;

                      return (
                        <tr key={b.id} className="hover:bg-navy-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-navy-900">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[200px]" title={b.file_name}>
                                {b.file_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-navy-700 font-medium">
                            {b.uploader_name || "Admin"}
                          </td>
                          <td className="px-5 py-3.5 text-navy-500 whitespace-nowrap">
                            {formatDateTime(b.created_at)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-navy-900 font-bold" title="Total rows">
                                {b.total_records} total
                              </span>
                              <span>·</span>
                              <span className="text-emerald-700 font-semibold" title="Successfully imported">
                                {b.imported_records} imported
                              </span>
                              <span>·</span>
                              <span className="text-amber-700" title="Duplicates skipped/updated">
                                {b.duplicate_records} dup
                              </span>
                              {b.failed_records > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-red-600 font-semibold" title="Failed records">
                                    {b.failed_records} failed
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview Records */}
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-navy-700 bg-white border border-navy-200 hover:bg-navy-50"
                                title="Preview imported records"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>

                              {/* Download Original File */}
                              {b.file_path && (
                                <button
                                  type="button"
                                  onClick={() => handleDownload(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                                  title="Download original file from Supabase Storage"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </button>
                              )}

                              {/* Errors details (if any) */}
                              {hasErrors && (
                                <button
                                  type="button"
                                  onClick={() => setErrorsBatch(b)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                                  title="View import errors"
                                >
                                  <FileWarning className="w-3 h-3" />
                                </button>
                              )}

                              {/* Delete Batch and records */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(b)}
                                className="p-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
                                title="Delete batch and its vehicle records"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Preview Imported Records for Batch */}
      {previewBatch && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewBatch(null)}
        >
          <div
            className="bg-white rounded-2xl border border-navy-200 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-navy-200 flex items-center justify-between bg-navy-50/70">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Imported Records Preview</h3>
                  <p className="text-xs text-navy-500">
                    Source: {previewBatch.file_name} · {previewBatch.imported_records} records imported
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-navy-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingPreview ? (
                <div className="py-12 text-center text-xs text-navy-500">Loading batch records…</div>
              ) : previewVehicles.length === 0 ? (
                <div className="py-12 text-center text-xs text-navy-500">
                  No active vehicle records currently linked to this batch.
                </div>
              ) : (
                <div className="border border-navy-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-navy-50 border-b border-navy-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-navy-600">Customer Name</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-navy-600">Registration</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-navy-600">Agreement</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-navy-600">Make / Model</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-navy-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {previewVehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-navy-50/50">
                          <td className="px-4 py-2.5 font-semibold text-navy-900">{v.customer_name}</td>
                          <td className="px-4 py-2.5 font-mono text-navy-800">{v.registration_number || "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-navy-700">{v.agreement_number || "—"}</td>
                          <td className="px-4 py-2.5 text-navy-700">
                            {[v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                              {v.status || "active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-navy-200 bg-navy-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                className="h-9 px-4 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Import Errors Viewer */}
      {errorsBatch && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setErrorsBatch(null)}
        >
          <div
            className="bg-white rounded-2xl border border-navy-200 shadow-2xl w-full max-w-lg p-6 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-navy-900 text-sm">Batch Import Warnings &amp; Errors</h3>
              </div>
              <button
                type="button"
                onClick={() => setErrorsBatch(null)}
                className="text-navy-400 hover:text-navy-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-navy-600 mb-3">
              Details for <strong>{errorsBatch.file_name}</strong>:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {(errorsBatch.errors as { row: number; error: string; identifier?: string }[])?.map((err, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 text-red-800">
                  <span className="font-bold">Row {err.row}: </span>
                  <span>{err.error}</span>
                  {err.identifier && <span className="font-mono ml-1 text-red-950 font-semibold">({err.identifier})</span>}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-navy-100 mt-4">
              <button
                type="button"
                onClick={() => setErrorsBatch(null)}
                className="h-9 px-4 rounded-lg bg-navy-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Batch Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl border border-navy-200 shadow-2xl w-full max-w-md p-6 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-navy-900 mb-2">Delete Upload Batch?</h3>
            <p className="text-xs text-navy-600 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-navy-900">{deleteTarget.file_name}</strong>?
            </p>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1 mb-6">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> High Impact Action:
              </p>
              <p>
                This will permanently delete this upload record, remove the original Excel file from storage,
                and <strong>delete all vehicle records</strong> that were imported under this batch.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-xl border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
              >
                {deleting ? "Deleting…" : "Confirm Permanent Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
