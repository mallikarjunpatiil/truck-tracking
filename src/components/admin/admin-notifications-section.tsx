"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MapPin,
  ExternalLink,
  MessageSquare,
  Clock,
  RefreshCw,
  User,
  Car,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import type { VehicleAccessLog } from "@/types/database";

export function AdminNotificationsSection() {
  const [notifications, setNotifications] = useState<VehicleAccessLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<VehicleAccessLog | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/notifications?limit=30`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchTerm) url += `&query=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        toast.success("All access notifications marked as read");
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  // Mark single as read
  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  };

  return (
    <>
      <div className="enterprise-card border border-navy-200 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-navy-200 bg-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-navy-900 text-sm">User Access Notifications &amp; Activity</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-navy-500">Real-time audit log of user vehicle lookups, GPS location, and WhatsApp/SMS delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-navy-200 text-xs font-semibold text-navy-700 hover:bg-navy-50"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Mark all read</span>
              </button>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, reg, phone…"
                className="h-8 pl-8 pr-2.5 rounded-lg border border-navy-200 bg-navy-50/50 text-xs text-navy-800 placeholder:text-navy-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2 rounded-lg border border-navy-200 bg-white text-xs text-navy-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="unread">Unread Only</option>
                <option value="granted">Location Granted</option>
                <option value="denied">Location Denied</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadNotifications()}
              className="w-8 h-8 rounded-lg border border-navy-200 flex items-center justify-center text-navy-500 hover:bg-navy-50 hover:text-navy-800"
              title="Refresh access logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-navy-100 animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="w-10 h-10 text-navy-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-navy-700">No vehicle access events recorded</p>
              <p className="text-[11px] text-navy-400 mt-0.5">
                When authorized users open a vehicle details record, access notifications will be dispatched here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const hasCoords = n.latitude !== null && n.longitude !== null;
                const isGranted = n.location_status === "granted";
                const mapsUrl =
                  n.google_maps_url ||
                  n.maps_link ||
                  (hasCoords ? `https://www.google.com/maps?q=${n.latitude},${n.longitude}` : null);

                const notifStatus = n.notification_sent ? "sent" : (n.notification_status || (n.notification_error ? "failed" : "logged"));

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedEvent(n);
                      if (!n.is_read) handleMarkSingleRead(n.id);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                      !n.is_read
                        ? "bg-blue-50/40 border-blue-200"
                        : "bg-white border-navy-200/80 hover:bg-navy-50/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: User & Vehicle summary */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isGranted ? "bg-emerald-100 text-emerald-800" : "bg-navy-100 text-navy-700"
                          }`}
                        >
                          {n.user_name ? n.user_name.charAt(0).toUpperCase() : "U"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-navy-900 text-xs">{n.user_name || "User"}</span>
                            <span className="font-mono text-[11px] bg-navy-100 text-navy-800 px-1.5 py-0.2 rounded font-medium">
                              {n.user_id_code || n.user_id?.substring(0, 8)}
                            </span>
                            <span className="text-navy-400 text-xs">accessed</span>
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {n.registration_number || "NO REG"}
                            </span>
                            <span className="text-xs font-semibold text-navy-800 truncate max-w-[160px]">
                              ({n.customer_name})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-navy-500 mt-1">
                            {n.user_phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5" /> {n.user_phone}
                              </span>
                            )}
                            {n.agreement_number && (
                              <span>Agreement: <span className="font-mono">{n.agreement_number}</span></span>
                            )}
                            <span>·</span>
                            <span className="flex items-center gap-1 text-navy-400">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDateTime(n.accessed_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badges and quick actions */}
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {/* Location Badge */}
                        {isGranted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            GPS Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy-100 text-navy-600">
                            Location {n.location_status || "Denied"}
                          </span>
                        )}

                        {/* WhatsApp / SMS Delivery Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            notifStatus === "sent"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : notifStatus === "failed"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp: {notifStatus}
                        </span>

                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200"
                          >
                            <MapPin className="w-3 h-3" />
                            Map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Access Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl border border-navy-200 shadow-2xl w-full max-w-lg p-6 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-navy-900 text-base">Vehicle Record Accessed</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-navy-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Structured Card matching user format */}
            <div className="space-y-4 text-xs">
              {/* User details */}
              <div className="p-3.5 rounded-xl bg-navy-50/80 border border-navy-200 space-y-1.5">
                <p className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-2">
                  User Details
                </p>
                <p className="text-navy-800">
                  <strong>User Name:</strong> {selectedEvent.user_name || "—"}
                </p>
                <p className="text-navy-800 font-mono">
                  <strong>User ID:</strong> {selectedEvent.user_id_code || selectedEvent.user_id}
                </p>
                <p className="text-navy-800 font-mono">
                  <strong>User Phone:</strong> {selectedEvent.user_phone || "Not provided"}
                </p>
                <p className="text-navy-800">
                  <strong>User Email:</strong> {selectedEvent.user_email || "—"}
                </p>
              </div>

              {/* Vehicle details */}
              <div className="p-3.5 rounded-xl bg-navy-50/80 border border-navy-200 space-y-1.5">
                <p className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Vehicle Details
                </p>
                <p className="text-navy-800">
                  <strong>Customer Name:</strong> {selectedEvent.customer_name}
                </p>
                <p className="text-navy-800 font-mono">
                  <strong>Agreement Number:</strong> {selectedEvent.agreement_number || "—"}
                </p>
                <p className="text-navy-800 font-mono">
                  <strong>Registration Number:</strong> {selectedEvent.registration_number || "—"}
                </p>
                <p className="text-navy-800">
                  <strong>Vehicle Model:</strong> {selectedEvent.vehicle_model || "Fleet Unit"}
                </p>
              </div>

              {/* Access & Location details */}
              <div className="p-3.5 rounded-xl bg-navy-50/80 border border-navy-200 space-y-1.5">
                <p className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Access &amp; Location Audit
                </p>
                <p className="text-navy-800">
                  <strong>Access Timestamp:</strong> {formatDateTime(selectedEvent.accessed_at)}
                </p>
                <p className="text-navy-800">
                  <strong>Location Status:</strong>{" "}
                  <span className="capitalize font-semibold">{selectedEvent.location_status || "Denied"}</span>
                </p>
                {selectedEvent.latitude && selectedEvent.longitude ? (
                  <>
                    <p className="text-navy-800 font-mono">
                      <strong>Coordinates:</strong> {selectedEvent.latitude.toFixed(5)}, {selectedEvent.longitude.toFixed(5)}{" "}
                      {selectedEvent.location_accuracy && `(±${Math.round(selectedEvent.location_accuracy)}m)`}
                    </p>
                    <div className="pt-1">
                      <a
                        href={`https://www.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Open Google Maps Location Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-navy-500 italic">No GPS coordinates recorded (permission not granted).</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-navy-100 mt-4">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="h-9 px-4 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800"
              >
                Close Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
