"use client";

import { useEffect, useState } from "react";
import { FileText, Search, Clock, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface LogRow {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from("audit_logs")
      .select("id, user_id, action, resource_type, details, created_at, profiles:user_id(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (actionFilter) query = query.eq("action", actionFilter);

    const { data, count } = await query;
    setLogs((data as unknown as LogRow[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [page, actionFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filteredLogs = searchTerm
    ? logs.filter((l) => {
        const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return (
          l.action.includes(searchTerm.toLowerCase()) ||
          profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : logs;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Audit Logs</h1>
        <p className="text-sm text-navy-500 mt-1">System activity and security audit trail</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs…"
            className="enterprise-input pl-10 h-10 text-xs"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="enterprise-input pl-9 h-10 text-xs w-48"
          >
            <option value="">All Activities</option>
            <option value="vehicle_search">Vehicle Search</option>
            <option value="vehicle_view">Vehicle View</option>
            <option value="file_upload">File Upload</option>
            <option value="user_created">User Created</option>
            <option value="user_deleted">User Deleted</option>
            <option value="user_login">User Login</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="enterprise-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-navy-100 animate-pulse" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-navy-300 mx-auto mb-4" />
            <p className="font-medium text-navy-700 mb-1">No audit logs found</p>
            <p className="text-sm text-navy-500">Activity logs will appear here</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-200 bg-navy-50">
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Activity</th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">User</th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Resource</th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Details</th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    return (
                      <tr key={log.id} className="border-b border-navy-100 last:border-0 hover:bg-navy-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-navy-100 text-navy-700 capitalize">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-navy-700 text-xs">
                          {profile?.full_name || profile?.email || "System"}
                        </td>
                        <td className="px-5 py-3.5 text-navy-500 text-xs capitalize">
                          {log.resource_type?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-navy-500 text-xs max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details).slice(0, 60) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-navy-500 text-xs whitespace-nowrap flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(log.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-navy-100">
              {filteredLogs.map((log) => {
                const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                return (
                  <div key={log.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy-100 text-navy-700 capitalize">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-navy-400">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="text-xs text-navy-600">{profile?.full_name || profile?.email || "System"}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-navy-200 flex items-center justify-between">
            <p className="text-xs text-navy-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 hover:bg-navy-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-navy-600 px-2">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 hover:bg-navy-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
