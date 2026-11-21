"use client";

import { useState } from "react";
import { ExcelUploader } from "@/components/admin/excel-uploader";
import { UploadedFilesHistory } from "@/components/admin/uploaded-files-history";
import { AdminNotificationsSection } from "@/components/admin/admin-notifications-section";
import { AdminStats } from "@/components/admin/admin-stats";
import { Shield, Sparkles } from "lucide-react";

export function AdminDashboardMain() {
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setHistoryRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8 fade-in pb-12">
      {/* Executive Welcome & Key Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              <Shield className="w-3.5 h-3.5" />
              Administrative Command Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight mt-1.5">
            Admin Fleet &amp; Ingestion Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-navy-500 mt-1">
            Upload Excel vehicle sheets, monitor ingested fleet history, and track real-time user vehicle access.
          </p>
        </div>
      </div>

      {/* High-level Operational Stats */}
      <AdminStats />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EXCEL FILE UPLOAD BOX                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="excel-upload-heading">
        <ExcelUploader onUploadComplete={handleUploadComplete} />
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. COLLAPSIBLE UPLOADED FILES HISTORY                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="upload-history-heading">
        <UploadedFilesHistory refreshKey={historyRefreshKey} />
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. NOTIFICATIONS AND USER ACTIVITY SECTION                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="notifications-activity-heading">
        <AdminNotificationsSection />
      </section>
    </div>
  );
}
