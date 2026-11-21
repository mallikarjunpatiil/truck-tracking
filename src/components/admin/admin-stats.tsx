"use client";

import { useEffect, useState } from "react";
import { Users, FileSpreadsheet, TrendingUp, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ vehicles: 0, users: 0, batches: 0, admins: 0 });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [v, u, b, a] = await Promise.all([
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("upload_batches").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      ]);
      setStats({ vehicles: v.count || 0, users: u.count || 0, batches: b.count || 0, admins: a.count || 0 });
      setLoading(false);
    }
    load();
  }, []);

  const items = [
    { label: "Total Vehicles", value: stats.vehicles, icon: FileSpreadsheet, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Registered Users", value: stats.users, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", sub: `${stats.admins} admin(s)` },
    { label: "Upload Batches", value: stats.batches, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Admin Accounts", value: stats.admins, icon: Shield, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="enterprise-card p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-20 rounded bg-navy-100 animate-pulse" />
              <div className="h-8 w-14 rounded bg-navy-100 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-navy-500 font-medium">{item.label}</p>
                <p className="text-2xl font-bold text-navy-900 mt-1">{item.value.toLocaleString()}</p>
                {"sub" in item && item.sub && <p className="text-xs text-navy-400 mt-0.5">{item.sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
