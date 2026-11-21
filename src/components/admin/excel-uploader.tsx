"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  HelpCircle,
  Eye,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { VEHICLE_COLUMNS, MAX_FILE_SIZE } from "@/lib/constants";
import * as XLSX from "xlsx";

type Step = "select" | "mapping" | "preview" | "importing" | "done";

interface ParsedFile {
  file: File;
  fileName: string;
  fileSize: number;
  headers: string[];
  rawRows: Record<string, unknown>[];
}

interface ImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  status: string;
  batchId?: string;
  errors?: { row: number; error: string; identifier?: string }[];
}

export function ExcelUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [step, setStep] = useState<Step>("select");
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update">("skip");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel file client-side for instant preview and header detection
  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds maximum allowed size of 10 MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rawRows.length === 0) {
        toast.error("The selected file is empty. Please provide an Excel sheet with vehicle records.");
        return;
      }

      const headers = Object.keys(rawRows[0]);
      setParsed({
        file,
        fileName: file.name,
        fileSize: file.size,
        headers,
        rawRows,
      });

      // Automated column matching
      const autoMap: Record<string, string> = {};
      VEHICLE_COLUMNS.forEach((col) => {
        const cleanKey = col.key.toLowerCase().replace(/[\s_-]/g, "");
        const matched = headers.find((h) => {
          const cleanH = h.toLowerCase().replace(/[\s_-]/g, "");
          return cleanH === cleanKey || cleanH.includes(cleanKey) || cleanKey.includes(cleanH);
        });
        if (matched) autoMap[col.key] = matched;
      });

      setMapping(autoMap);
      setStep("mapping");
      toast.info(`Loaded ${rawRows.length} rows. Please verify column mappings.`);
    } catch (err) {
      console.error("Excel parse error:", err);
      toast.error("Failed to parse Excel file. Please verify file integrity.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleStartImport = async () => {
    if (!parsed || !mapping.customer_name) {
      toast.error("Customer Name column mapping is mandatory.");
      return;
    }

    setShowConfirmModal(false);
    setImporting(true);
    setStep("importing");
    setProgress(15);

    try {
      const progressTimer = setInterval(() => {
        setProgress((p) => Math.min(p + 12, 90));
      }, 350);

      const formData = new FormData();
      formData.append("file", parsed.file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("duplicateStrategy", duplicateStrategy);

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);
      setProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete data import");

      setSummary(data);
      setStep("done");
      toast.success(`Import complete! ${data.imported} vehicle records saved to database.`);

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import operation failed");
      setStep("mapping");
    } finally {
      setImporting(false);
    }
  };

  const resetUploader = () => {
    setStep("select");
    setParsed(null);
    setMapping({});
    setProgress(0);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="enterprise-card border border-navy-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-navy-200 bg-navy-50/70 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-navy-900 text-sm">Excel File Upload &amp; Registry Ingestion</h3>
            <p className="text-xs text-navy-500">Securely store original file in Supabase Storage and import records</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { key: "select", label: "1. Select File" },
            { key: "mapping", label: "2. Map Columns" },
            { key: "preview", label: "3. Preview" },
            { key: "done", label: "4. Finished" },
          ].map((s, idx) => (
            <div key={s.key} className="flex items-center">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-navy-300 mx-1" />}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  step === s.key
                    ? "bg-navy-900 text-white"
                    : "text-navy-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* STEP 1: Drag and Drop Upload */}
        {step === "select" && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-blue-500 bg-blue-50/60 scale-[0.99]"
                  : "border-navy-300 hover:border-navy-400 hover:bg-navy-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-navy-900 mb-1">
                Drag and drop your Excel file here
              </h4>
              <p className="text-xs text-navy-500 mb-4">
                Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheets · Max file size: 10 MB
              </p>

              <button
                type="button"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Browse Files
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-navy-50/70 border border-navy-100 flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-navy-400 shrink-0 mt-0.5" />
              <div className="text-xs text-navy-600 leading-relaxed">
                <span className="font-semibold text-navy-800">Automatic Storage &amp; Database Import:</span>{" "}
                Uploaded files are stored privately in Supabase Storage (<code className="font-mono text-navy-900">vehicle-uploads</code>),
                parsed for column mappings, checked for duplicate registrations, and inserted as structured records into the vehicle database.
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === "mapping" && parsed && (
          <div className="space-y-6">
            {/* File info banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-50 border border-navy-200">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="font-bold text-navy-900 text-xs">{parsed.fileName}</span>
                  <span className="text-[11px] text-navy-500 ml-2">
                    ({(parsed.fileSize / 1024).toFixed(1)} KB · {parsed.rawRows.length} rows detected)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={resetUploader}
                className="inline-flex items-center gap-1 text-xs text-navy-500 hover:text-navy-900 font-semibold"
              >
                <X className="w-3.5 h-3.5" /> Change File
              </button>
            </div>

            {/* Duplicate policy options */}
            <div className="p-4 rounded-xl border border-navy-200 bg-white space-y-2">
              <label className="text-xs font-bold text-navy-900 block">
                Duplicate Record Resolution Policy
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-navy-700">
                  <input
                    type="radio"
                    name="dupPolicy"
                    value="skip"
                    checked={duplicateStrategy === "skip"}
                    onChange={() => setDuplicateStrategy("skip")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Skip duplicates:</strong> Keep existing record, do not overwrite.
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-navy-700">
                  <input
                    type="radio"
                    name="dupPolicy"
                    value="update"
                    checked={duplicateStrategy === "update"}
                    onChange={() => setDuplicateStrategy("update")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Update existing:</strong> Refresh existing records with new Excel values.
                  </span>
                </label>
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div>
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">
                Map Excel Columns to Database Fields
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {VEHICLE_COLUMNS.map((col) => {
                  const isRequired = "required" in col && col.required;
                  return (
                    <div key={col.key} className="p-3 rounded-lg bg-navy-50/60 border border-navy-200/80">
                      <label className="text-xs font-semibold text-navy-800 block mb-1">
                        {col.label}
                        {isRequired && <span className="text-red-600 ml-1 font-bold">*</span>}
                      </label>
                      <select
                        value={mapping[col.key] || ""}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [col.key]: e.target.value }))
                        }
                        className="w-full h-8 px-2 rounded-md border border-navy-300 bg-white text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">— Not Mapped —</option>
                        {parsed.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-navy-100">
              <button
                type="button"
                onClick={() => setStep("preview")}
                disabled={!mapping.customer_name}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-navy-200 text-navy-800 text-xs font-semibold hover:bg-navy-50"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Mapped Rows
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!mapping.customer_name}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                <span>Confirm &amp; Import ({parsed.rawRows.length} Records)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview Data */}
        {step === "preview" && parsed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                Preview Mapped Records (First 5 Rows)
              </h4>
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← Back to Column Mapping
              </button>
            </div>

            <div className="border border-navy-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-navy-50 border-b border-navy-200">
                    <th className="px-3 py-2 text-left font-semibold text-navy-500">#</th>
                    {VEHICLE_COLUMNS.filter((c) => mapping[c.key]).map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left font-semibold text-navy-700 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {parsed.rawRows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-navy-50/50">
                      <td className="px-3 py-2 text-navy-400 font-mono">{rIdx + 1}</td>
                      {VEHICLE_COLUMNS.filter((c) => mapping[c.key]).map((col) => (
                        <td key={col.key} className="px-3 py-2 text-navy-900 max-w-[160px] truncate">
                          {String(row[mapping[col.key]] || "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="h-10 px-4 rounded-xl border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50"
              >
                Edit Mapping
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="h-10 px-6 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 shadow-sm"
              >
                Proceed with Import
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Importing State */}
        {step === "importing" && (
          <div className="py-12 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h4 className="text-base font-bold text-navy-900 mb-1">Importing Vehicle Records…</h4>
            <p className="text-xs text-navy-500 mb-6">
              Storing file in Supabase Storage, checking duplicates, and saving structured records.
            </p>

            <div className="w-full h-2.5 bg-navy-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-navy-400 font-mono mt-2">{progress}% completed</p>
          </div>
        )}

        {/* STEP 5: Done / Summary */}
        {step === "done" && summary && (
          <div className="py-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-navy-900 mb-1">Data Import Completed</h4>
            <p className="text-xs text-navy-500 mb-6">
              Excel file processed and structured vehicle records stored in database.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xl font-bold text-emerald-800 block">{summary.imported}</span>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">Imported</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xl font-bold text-amber-800 block">{summary.duplicates}</span>
                <span className="text-[11px] font-semibold text-amber-600 uppercase">Duplicates</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="text-xl font-bold text-red-800 block">{summary.failed}</span>
                <span className="text-[11px] font-semibold text-red-600 uppercase">Failed</span>
              </div>
            </div>

            {summary.errors && summary.errors.length > 0 && (
              <div className="text-left mb-6 p-3 rounded-xl bg-navy-50 border border-navy-200 max-h-36 overflow-y-auto text-xs text-navy-600">
                <p className="font-bold text-navy-800 mb-1">Import Warnings ({summary.errors.length}):</p>
                <ul className="space-y-1 list-disc list-inside">
                  {summary.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.error} {err.identifier ? `(${err.identifier})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={resetUploader}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 shadow-sm"
            >
              Upload Another Excel File
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && parsed && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-navy-200 shadow-2xl w-full max-w-md p-6 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
              <FileCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-navy-900 mb-1">Confirm Excel Ingestion</h3>
            <p className="text-xs text-navy-600 mb-4 leading-relaxed">
              You are about to import <strong className="text-navy-900">{parsed.rawRows.length} records</strong> from{" "}
              <strong className="text-navy-900">{parsed.fileName}</strong> into the live vehicle registry.
            </p>

            <div className="p-3 rounded-xl bg-navy-50 border border-navy-200 text-xs text-navy-700 space-y-1 mb-6">
              <p>
                <strong>Duplicate Policy:</strong>{" "}
                {duplicateStrategy === "skip" ? "Skip matching existing records" : "Update existing records with new values"}
              </p>
              <p>
                <strong>Customer Name Column:</strong> {mapping.customer_name}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-xl border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                className="flex-1 h-10 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 shadow-sm"
              >
                Confirm &amp; Ingest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
