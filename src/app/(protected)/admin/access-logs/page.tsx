"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  MapPin,
  ExternalLink,
  MessageSquare,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Car,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { VehicleAccessLog } from "@/types/database";

const PAGE_SIZE = 25;

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<VehicleAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("vehicle_access_logs")
        .select("*", { count: "exact" })
        .order("accessed_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter) {
        query = query.eq("location_status", statusFilter);
      }

      const { data, count, error } = await query;
      if (error) {
        console.error("Error loading access logs:", error);
      } else {
        setLogs((data as unknown as VehicleAccessLog[]) || []);
        setTotal(count || 0);
      }
    } catch (err) {
      console.error("Exception loading access logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filteredLogs = searchTerm
    ? logs.filter((l) => {
        const term = searchTerm.toLowerCase();
        return (
          l.user_name?.toLowerCase().includes(term) ||
          l.user_email?.toLowerCase().includes(term) ||
          l.user_id_code?.toLowerCase().includes(term) ||
          l.user_phone?.toLowerCase().includes(term) ||
          l.customer_name?.toLowerCase().includes(term) ||
          l.registration_number?.toLowerCase().includes(term) ||
          l.agreement_number?.toLowerCase().includes(term)
        );
      })
    : logs;

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-navy-900">Vehicle Access &amp; Location History</h1>
          </div>
          <p className="text-sm text-navy-500 mt-1">
            Real-time audit trail of vehicle views, verified GPS coordinates, and administrative WhatsApp/SMS notifications.
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50 shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, ID, phone, customer, or registration…"
            className="enterprise-input pl-10 h-10 text-xs w-full"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="enterprise-input pl-9 h-10 text-xs w-52"
          >
            <option value="">All Location Statuses</option>
            <option value="granted">Location Granted</option>
            <option value="denied">Location Denied</option>
            <option value="unavailable">Location Unavailable</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="enterprise-card overflow-hidden shadow-sm border border-navy-200">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-navy-100 animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck className="w-12 h-12 text-navy-300 mx-auto mb-3" />
            <p className="font-semibold text-navy-700">No access records found</p>
            <p className="text-xs text-navy-500 mt-1">
              When users view vehicle details, access coordinates and WhatsApp alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-200 bg-navy-50/70">
                  <th className="text-left px-5 py-3.5 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                    Access Time
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                    Vehicle Viewed
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                    Location &amp; Coordinates
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                    Notification Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {filteredLogs.map((log) => {
                  const hasCoords = log.latitude !== null && log.longitude !== null;
                  const isGranted = log.location_status === "granted";
                  const mapsUrl =
                    log.google_maps_url ||
                    log.maps_link ||
                    (hasCoords ? `https://www.google.com/maps?q=${log.latitude},${log.longitude}` : null);
                  const accuracyVal = log.location_accuracy ?? log.accuracy;
                  const notifStatus =
                    log.notification_status || (log.notification_sent ? "sent" : log.notification_error ? "failed" : "logged");

                  return (
                    <tr key={log.id} className="hover:bg-navy-50/50 transition-colors">
                      {/* Access Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-navy-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-navy-400" />
                          <span>{formatDateTime(log.accessed_at)}</span>
                        </div>
                      </td>

                      {/* User Details */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 shrink-0 text-xs font-bold mt-0.5">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900 text-xs">
                              {log.user_name || "Unknown User"}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-navy-500 mt-0.5">
                              <span className="font-mono bg-navy-100/80 px-1.5 py-0.2 rounded font-medium text-navy-800">
                                {log.user_id_code || log.user_id?.substring(0, 8)}
                              </span>
                              <span>·</span>
                              <span>{log.user_email || "No email"}</span>
                            </div>
                            {log.user_phone && (
                              <p className="text-[11px] text-navy-600 font-mono mt-0.5">
                                Phone: {log.user_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Viewed */}
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-navy-950 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                              {log.registration_number || "NO REG"}
                            </span>
                            <span className="text-xs font-semibold text-navy-900">
                              {log.customer_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-navy-500 mt-1 space-x-1.5">
                            {log.agreement_number && (
                              <span>Agreement: <span className="font-mono">{log.agreement_number}</span></span>
                            )}
                            {log.vehicle_model && (
                              <span>· Model: {log.vehicle_model}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Coordinates */}
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            {isGranted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Granted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <XCircle className="w-3 h-3" />
                                {log.location_status || "Denied"}
                              </span>
                            )}
                          </div>

                          {hasCoords ? (
                            <div className="space-y-1">
                              <p className="font-mono text-xs text-navy-700">
                                {log.latitude?.toFixed(5)}, {log.longitude?.toFixed(5)}
                                {accuracyVal !== null && accuracyVal !== undefined && (
                                  <span className="text-[10px] text-navy-400 ml-1">
                                    (±{Math.round(accuracyVal)}m)
                                  </span>
                                )}
                              </p>
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>Open Google Maps</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-navy-400 italic">No GPS coordinates recorded</p>
                          )}
                        </div>
                      </td>

                      {/* Notification Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              notifStatus === "sent"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : notifStatus === "failed"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            {notifStatus}
                          </span>
                          <p className="text-[10px] text-navy-400">
                            Channel: {log.notification_channel || "WhatsApp"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-navy-200 bg-navy-50/50">
            <span className="text-xs text-navy-500">
              Showing page <span className="font-semibold text-navy-900">{page + 1}</span> of{" "}
              <span className="font-semibold text-navy-900">{totalPages}</span> ({total} total logs)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-200 bg-white text-xs font-semibold text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-200 bg-white text-xs font-semibold text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-50"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
