"use client";

import { useEffect, useState } from "react";
import { Clock, Search, Eye, Upload, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types/database";

const icons: Record<string, React.ElementType> = {
  vehicle_search: Search,
  vehicle_view: Eye,
  file_upload: Upload,
  user_login: Shield,
};

export function RecentActivity({ userId }: { userId?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        let targetUid = userId;
        if (!targetUid) {
          const { data: { user } } = await supabase.auth.getUser();
          targetUid = user?.id;
        }

        if (!targetUid) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("audit_logs")
          .select("id, action, created_at, resource_type, user_id, details")
          .eq("user_id", targetUid)
          .order("created_at", { ascending: false })
          .limit(8);

        setLogs((data as unknown as AuditLog[]) || []);
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  return (
    <div className="enterprise-card">
      <div className="px-5 py-4 border-b border-navy-200 flex items-center gap-2">
        <Clock className="w-4 h-4 text-navy-500" />
        <h3 className="font-semibold text-navy-900 text-sm">Recent Activity</h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-navy-100 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <Clock className="w-10 h-10 text-navy-300 mx-auto mb-3" />
            <p className="text-sm text-navy-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const Icon = icons[log.action] || Clock;
              return (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-800 capitalize">
                      {log.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-navy-500">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
