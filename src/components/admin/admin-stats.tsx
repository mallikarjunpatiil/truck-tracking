"use client";

import { useEffect, useState } from "react";
import { Users, FileSpreadsheet, TrendingUp, Shield } from "lucide-react";

export function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ vehicles: 0, users: 0, batches: 0, admins: 0 });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStats({
              vehicles: data.vehicles || 0,
              users: data.users || 0,
              batches: data.batches || 0,
              admins: data.admins || 0,
            });
          }
        }
      } catch (err) {
        console.warn("Stats fetch notice:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
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
        <div key={item.label} className="enterprise-card p-5 border border-navy-200/80 shadow-sm">
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
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
