"use client";

import { useEffect, useState } from "react";
import { FileText, TrendingUp, Users, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DashboardStats({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(true);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [searchesToday, setSearchesToday] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        let targetUid = userId;
        if (!targetUid) {
          const { data: { user } } = await supabase.auth.getUser();
          targetUid = user?.id;
        }

        const today = new Date().toISOString().slice(0, 10);
        const [vRes, aRes, sRes] = await Promise.all([
          supabase.from("vehicles").select("id", { count: "estimated", head: true }),
          supabase.from("vehicles").select("id", { count: "estimated", head: true }).not("status", "eq", "inactive"),
          targetUid
            ? supabase.from("audit_logs").select("id", { count: "exact", head: true })
                .eq("user_id", targetUid).eq("action", "vehicle_search")
                .gte("created_at", today)
            : Promise.resolve({ count: 0 }),
        ]);

        setVehicleCount(vRes.count || 0);
        setActiveCount(aRes.count || 0);
        setSearchesToday(sRes.count || 0);
      } catch {
        // Fallback gracefully on network/db issues
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const stats = [
    { label: "Total Vehicles", value: vehicleCount, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Agreements", value: activeCount, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Searches Today", value: searchesToday, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Last Updated", value: "Live", icon: Clock, color: "text-violet-600", bg: "bg-violet-50", isText: true },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="enterprise-card p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-20 rounded bg-navy-100 animate-pulse" />
              <div className="h-8 w-14 rounded bg-navy-100 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-navy-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-navy-900 mt-1">
                  {"isText" in s && s.isText ? s.value : (s.value as number).toLocaleString()}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
