"use client";

import { useEffect, useState } from "react";
import { History, Search, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types/database";

export default function HistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("audit_logs").select("*")
        .eq("user_id", user.id).eq("action", "vehicle_search")
        .order("created_at", { ascending: false }).limit(50);
      setLogs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Search History</h1>
        <p className="text-sm text-navy-500 mt-1">Your recent vehicle search activity</p>
      </div>

      <div className="enterprise-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-navy-100 animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <History className="w-12 h-12 text-navy-300 mx-auto mb-4" />
            <p className="font-medium text-navy-700 mb-1">No search history yet</p>
            <p className="text-sm text-navy-500">Your vehicle searches will appear here</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 bg-navy-50">
                <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Search Type</th>
                <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Results</th>
                <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const details = log.details as Record<string, unknown> | null;
                return (
                  <tr key={log.id} className="border-b border-navy-100 last:border-0 hover:bg-navy-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                          <Search className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="font-medium text-navy-800 capitalize">
                          {((details?.search_type as string) || "vehicle search").replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-700">
                        {(details?.results_count as number) || 0} found
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy-500 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
