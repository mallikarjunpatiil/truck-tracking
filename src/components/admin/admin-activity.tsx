"use client";

import { useEffect, useState } from "react";
import { Activity, Search, Upload, UserCheck, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  action: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

const icons: Record<string, React.ElementType> = {
  vehicle_search: Search, file_upload: Upload, user_created: UserCheck, user_login: LogIn,
};

export function AdminActivity() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("audit_logs")
        .select("id, action, created_at, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false }).limit(10);
      setLogs((data as unknown as LogEntry[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="enterprise-card">
      <div className="px-5 py-4 border-b border-navy-200 flex items-center gap-2">
        <Activity className="w-4 h-4 text-navy-500" />
        <h3 className="font-semibold text-navy-900 text-sm">System Activity</h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-navy-100 animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="w-10 h-10 text-navy-300 mx-auto mb-3" />
            <p className="text-sm text-navy-500">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const Icon = icons[log.action] || Activity;
              const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
              return (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy-800 truncate">
                      <span className="font-medium capitalize">{log.action.replace(/_/g, " ")}</span>
                      {profile && <span className="text-navy-500"> by {profile.full_name || profile.email}</span>}
                    </p>
                    <p className="text-xs text-navy-400">{formatDateTime(log.created_at)}</p>
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
