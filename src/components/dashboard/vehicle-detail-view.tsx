"use client";

import { useState, useEffect, useRef } from "react";
import {
  Car,
  User,
  FileText,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  Copy,
  Check,
  Shield,
  FileDown,
  Image as ImageIcon,
  AlertCircle,
  Truck,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/lib/use-geolocation";
import type { Vehicle } from "@/types/database";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  if (!value || value === "—") return null;
  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-navy-400 hover:text-navy-700 transition-colors p-1 rounded"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-navy-400" />}
    </button>
  );
}

interface VehicleDetailViewProps {
  vehicle: Vehicle;
  isAdmin?: boolean;
  userId?: string;
  onClose?: () => void;
  onEdit?: (v: Vehicle) => void;
  onDelete?: (v: Vehicle) => void;
}

export function VehicleDetailView({
  vehicle,
  isAdmin,
  userId,
  onClose,
  onEdit,
  onDelete,
}: VehicleDetailViewProps) {
  const { requestLocation } = useGeolocation();
  const [notificationStatus, setNotificationStatus] = useState<string>("pending");
  const [locationStatus, setLocationStatus] = useState<string>("Requesting permission...");
  const hasLoggedRef = useRef(false);

  // Trigger location request and automatic admin WhatsApp notification once on open
  useEffect(() => {
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;

    async function triggerNotification() {
      // 1. Request location with clear explanation
      let geoResult = {
        latitude: null as number | null,
        longitude: null as number | null,
        accuracy: null as number | null,
        status: "denied" as "granted" | "denied" | "unavailable" | "not_supported",
      };

      try {
        geoResult = await requestLocation();
        if (geoResult.status === "granted") {
          setLocationStatus(`Verified Location (${geoResult.latitude?.toFixed(4)}, ${geoResult.longitude?.toFixed(4)})`);
        } else {
          setLocationStatus("Location Permission Denied");
        }
      } catch {
        setLocationStatus("Location Unavailable");
      }

      // 2. Dispatch secure server-side admin WhatsApp notification
      try {
        const res = await fetch("/api/notifications/vehicle-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: vehicle.id,
            location: geoResult,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setNotificationStatus("Admin Notified");
        } else {
          setNotificationStatus("Logged for Admin");
        }
      } catch {
        setNotificationStatus("Logged for Admin");
      }
    }

    triggerNotification();
  }, [vehicle.id, requestLocation]);

  // Extract dynamic custom fields
  const customFields = vehicle.custom_fields || {};
  const agreementDetails = vehicle.agreement_details || {};
  const deliveryDetails = vehicle.delivery_details || {};
  const photographs = Array.isArray(vehicle.photographs) ? vehicle.photographs : [];
  const documents = Array.isArray(vehicle.documents) ? vehicle.documents : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="enterprise-card p-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white border-0 shadow-enterprise-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 text-blue-400">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {vehicle.registration_number || "NO REGISTRATION"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30 capitalize">
                  {vehicle.status || "Active"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {vehicle.customer_name}
              </h1>
              <p className="text-sm text-navy-300">
                Agreement #{vehicle.agreement_number || "N/A"} · {[vehicle.vehicle_make, vehicle.vehicle_model].filter(Boolean).join(" ") || "Fleet Vehicle"}
              </p>
            </div>
          </div>

          {/* Admin action buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onEdit && (
                <Button
                  onClick={() => onEdit(vehicle)}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold h-9 px-3 border border-white/20"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Record
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={() => onDelete(vehicle)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold h-9 px-3 border border-red-400/30"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Security & Notification Badge */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-navy-300 gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Audited Access Event: {notificationStatus}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{locationStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer & Agreement Section */}
        <div className="enterprise-card p-6">
          <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-navy-100 pb-3">
            <User className="w-4 h-4 text-blue-600" />
            Customer &amp; Agreement Details
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Customer Name</span>
              <div className="flex items-center">
                <span className="font-semibold text-navy-900">{vehicle.customer_name}</span>
                <CopyButton value={vehicle.customer_name} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Agreement Number</span>
              <div className="flex items-center">
                <span className="font-mono font-medium text-navy-800">{vehicle.agreement_number || "—"}</span>
                <CopyButton value={vehicle.agreement_number || ""} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Finance Institution</span>
              <span className="font-medium text-navy-800">{vehicle.finance_company || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Assigned Branch</span>
              <span className="font-medium text-navy-800">{vehicle.branch || "—"}</span>
            </div>

            {/* Dynamic Agreement Details */}
            {Object.entries(agreementDetails).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between pt-1">
                <span className="text-navy-500 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="font-medium text-navy-800">{String(val) || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Specifications Section */}
        <div className="enterprise-card p-6">
          <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-navy-100 pb-3">
            <Car className="w-4 h-4 text-blue-600" />
            Vehicle Specifications
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Registration Number</span>
              <div className="flex items-center">
                <span className="font-mono font-bold text-navy-950">{vehicle.registration_number || "—"}</span>
                <CopyButton value={vehicle.registration_number || ""} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Chassis Number (VIN)</span>
              <div className="flex items-center">
                <span className="font-mono font-medium text-navy-800">{vehicle.chassis_number || "—"}</span>
                <CopyButton value={vehicle.chassis_number || ""} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Engine Number</span>
              <div className="flex items-center">
                <span className="font-mono font-medium text-navy-800">{vehicle.engine_number || "—"}</span>
                <CopyButton value={vehicle.engine_number || ""} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Vehicle Type</span>
              <span className="font-medium text-navy-800">{vehicle.vehicle_type || "Truck"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Make &amp; Model</span>
              <span className="font-medium text-navy-800">
                {[vehicle.vehicle_make, vehicle.vehicle_model].filter(Boolean).join(" ") || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Model Year &amp; Color</span>
              <span className="font-medium text-navy-800">
                {[vehicle.vehicle_year, vehicle.vehicle_color].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery & Operational Details (if available) */}
      {(vehicle.remarks || Object.keys(deliveryDetails).length > 0 || Object.keys(customFields).length > 0) && (
        <div className="enterprise-card p-6">
          <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-navy-100 pb-3">
            <Building className="w-4 h-4 text-blue-600" />
            Operational &amp; Custom Admin Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {vehicle.remarks && (
              <div className="p-4 rounded-xl bg-navy-50 border border-navy-200/80 md:col-span-2">
                <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-1">Administrative Remarks</p>
                <p className="text-navy-800 leading-relaxed">{vehicle.remarks}</p>
              </div>
            )}

            {Object.entries(deliveryDetails).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-navy-50 border border-navy-100">
                <span className="text-xs text-navy-500 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="text-xs font-semibold text-navy-900">{String(v)}</span>
              </div>
            ))}

            {Object.entries(customFields).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-navy-50 border border-navy-100">
                <span className="text-xs text-navy-500 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="text-xs font-semibold text-navy-900">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photographs & Attachments */}
      <div className="enterprise-card p-6">
        <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-navy-100 pb-3">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          Vehicle Photographs &amp; Documents
        </h3>

        {photographs.length === 0 && documents.length === 0 ? (
          <div className="py-8 text-center bg-navy-50/50 rounded-xl border border-dashed border-navy-200">
            <FileDown className="w-8 h-8 text-navy-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-navy-600">No media attachments uploaded for this vehicle</p>
            <p className="text-[11px] text-navy-400 mt-0.5">Administrators can upload documents and photographs via the Admin Panel.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {photographs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-navy-500 mb-2">Photographs ({photographs.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photographs.map((photoUrl, i) => (
                    <a
                      key={i}
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-video rounded-lg overflow-hidden border border-navy-200 bg-navy-100 block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={`Vehicle photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-navy-500 mb-2">Attached Documents ({documents.length})</p>
                <div className="divide-y divide-navy-100 border border-navy-200 rounded-xl overflow-hidden">
                  {documents.map((doc, i) => (
                    <div key={i} className="p-3 flex items-center justify-between hover:bg-navy-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-navy-800">{doc.name || `Document ${i + 1}`}</span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
