"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { UploadBatch } from "@/types/database";

const statusStyles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  failed: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
  processing: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  pending: { bg: "bg-navy-100", text: "text-navy-600", icon: Clock },
};

export function RecentUploads() {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("upload_batches").select("*")
        .order("created_at", { ascending: false }).limit(8);
      setBatches(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="enterprise-card">
      <div className="px-5 py-4 border-b border-navy-200 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-navy-500" />
        <h3 className="font-semibold text-navy-900 text-sm">Recent Uploads</h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-navy-100 animate-pulse" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className="py-10 text-center">
            <FileSpreadsheet className="w-10 h-10 text-navy-300 mx-auto mb-3" />
            <p className="text-sm text-navy-500">No uploads yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => {
              const cfg = statusStyles[b.status] || statusStyles.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-navy-100 hover:bg-navy-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{b.file_name}</p>
                    <p className="text-xs text-navy-400">{b.imported_records}/{b.total_records} records · {formatDateTime(b.created_at)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
