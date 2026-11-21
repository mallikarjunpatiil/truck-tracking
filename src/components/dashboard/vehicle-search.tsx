"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  User,
  FileText,
  Car,
  Hash,
  Cog,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Truck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleDetailView } from "./vehicle-detail-view";
import type { Vehicle } from "@/types/database";

const VEHICLE_SELECT_FIELDS =
  "id, customer_name, agreement_number, registration_number, chassis_number, engine_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_type, finance_company, branch, status, remarks, photographs, documents, agreement_details, delivery_details, custom_fields";

const searchFields = [
  { key: "customer_name", label: "Customer Name", icon: User, placeholder: "Search by customer name…" },
  { key: "agreement_number", label: "Agreement No.", icon: FileText, placeholder: "Search by agreement number…" },
  { key: "registration_number", label: "Registration No.", icon: Car, placeholder: "Search by full registration number…" },
  { key: "last_four", label: "Last 4 Digits", icon: Hash, placeholder: "Enter last 4 digits of registration (e.g. 1234)…" },
  { key: "chassis_number", label: "Chassis No.", icon: Cog, placeholder: "Search by chassis number…" },
  { key: "engine_number", label: "Engine No.", icon: Cog, placeholder: "Search by engine number…" },
];

function highlightMatch(text: string | null | undefined, query: string) {
  if (!text) return "—";
  if (!query || query.trim().length === 0) return text;

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200/90 text-navy-950 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const emptyVehicleForm = {
  customer_name: "",
  agreement_number: "",
  registration_number: "",
  chassis_number: "",
  engine_number: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_year: "",
  vehicle_color: "",
  vehicle_type: "Truck",
  finance_company: "",
  branch: "",
  status: "active",
  remarks: "",
};

export function VehicleSearch({ userId, isAdmin }: { userId?: string; isAdmin?: boolean }) {
  const [searchType, setSearchType] = useState("customer_name");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Admin action states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState(emptyVehicleForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cacheRef = useRef<Map<string, Vehicle[]>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = async (term: string, type: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const cacheKey = `${type}:${trimmed.toLowerCase()}`;
    if (cacheRef.current.has(cacheKey)) {
      setResults(cacheRef.current.get(cacheKey)!);
      setHasSearched(true);
      setIsCollapsed(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const supabase = createClient();
      let query = supabase.from("vehicles").select(VEHICLE_SELECT_FIELDS);

      if (type === "customer_name") {
        query = query.ilike("customer_name", `%${trimmed}%`);
      } else if (type === "agreement_number") {
        query = query.ilike("agreement_number", `%${trimmed}%`);
      } else if (type === "registration_number") {
        query = query.ilike("registration_number", `%${trimmed}%`);
      } else if (type === "last_four") {
        // Last 4 digits: match suffix or substring of length <= 4
        query = query.ilike("registration_number", `%${trimmed}`);
      } else if (type === "chassis_number") {
        query = query.ilike("chassis_number", `%${trimmed}%`);
      } else if (type === "engine_number") {
        query = query.ilike("engine_number", `%${trimmed}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) {
        toast.error("Search failed. Please try again.");
        return;
      }

      const list = (data as unknown as Vehicle[]) || [];
      cacheRef.current.set(cacheKey, list);
      setResults(list);
      setIsCollapsed(false);

      if (list.length === 0) {
        toast.info("No vehicles found matching your search");
      }

      // Non-blocking background audit logging
      const recordLog = (uid: string) => {
        supabase
          .from("audit_logs")
          .insert({
            user_id: uid,
            action: "vehicle_search",
            resource_type: "vehicle",
            details: { search_type: type, term: trimmed, results_count: list.length },
          })
          .then(() => {});
      };

      if (userId) {
        recordLog(userId);
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) recordLog(user.id);
        });
      }
    } catch {
      toast.error("An unexpected error occurred during search");
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-search when typing 3+ characters
  const handleInputChange = (val: string) => {
    setSearchValue(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(val, searchType);
      }, 400);
    } else if (val.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!searchValue.trim()) {
      toast.error("Please enter a search term");
      return;
    }
    executeSearch(searchValue, searchType);
  };

  // ADMIN ACTION: Add Vehicle
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vehicle");

      toast.success("Vehicle record created successfully");
      setShowAddModal(false);
      setFormData(emptyVehicleForm);
      cacheRef.current.clear();

      if (data.vehicle) {
        setResults((prev) => [data.vehicle, ...prev]);
        setHasSearched(true);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  // ADMIN ACTION: Open Edit Modal
  const openEditModal = (v: Vehicle) => {
    setFormData({
      customer_name: v.customer_name || "",
      agreement_number: v.agreement_number || "",
      registration_number: v.registration_number || "",
      chassis_number: v.chassis_number || "",
      engine_number: v.engine_number || "",
      vehicle_make: v.vehicle_make || "",
      vehicle_model: v.vehicle_model || "",
      vehicle_year: v.vehicle_year ? v.vehicle_year.toString() : "",
      vehicle_color: v.vehicle_color || "",
      vehicle_type: v.vehicle_type || "Truck",
      finance_company: v.finance_company || "",
      branch: v.branch || "",
      status: v.status || "active",
      remarks: v.remarks || "",
    });
    setShowEditModal(true);
  };

  // ADMIN ACTION: Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vehicle");

      toast.success("Vehicle updated successfully");
      setShowEditModal(false);
      cacheRef.current.clear();

      if (data.vehicle) {
        setSelectedVehicle(data.vehicle);
        setResults((prev) => prev.map((item) => (item.id === selectedVehicle.id ? data.vehicle : item)));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  };

  // ADMIN ACTION: Delete Vehicle
  const handleDeleteConfirm = async () => {
    if (!selectedVehicle) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete vehicle");

      toast.success("Vehicle record deleted successfully");
      setShowDeleteConfirm(false);
      cacheRef.current.clear();
      setResults((prev) => prev.filter((item) => item.id !== selectedVehicle.id));
      setSelectedVehicle(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setDeleting(false);
    }
  };

  const currentField = useMemo(
    () => searchFields.find((f) => f.key === searchType) || searchFields[0],
    [searchType]
  );

  return (
    <>
      {/* Search Bar Container */}
      <div className="enterprise-card p-6 shadow-sm border border-navy-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">Vehicle Search &amp; Registry</h2>
              <p className="text-xs text-navy-500">Search by Customer, Agreement, Registration, VIN, or Engine</p>
            </div>
          </div>

          {/* ADMIN ONLY: Add Vehicle Button */}
          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                setFormData(emptyVehicleForm);
                setShowAddModal(true);
              }}
              className="h-9 px-3 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Record
            </Button>
          )}
        </div>

        <form onSubmit={handleFormSubmit}>
          {/* Search Criteria Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {searchFields.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setSearchType(f.key);
                  setSearchValue("");
                  setResults([]);
                  setHasSearched(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  searchType === f.key
                    ? "bg-navy-900 text-white shadow-sm"
                    : "bg-navy-100/70 text-navy-600 hover:bg-navy-200 hover:text-navy-900"
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input Box */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={currentField.placeholder}
                className="w-full h-12 pl-12 pr-10 rounded-lg border border-navy-300 bg-white text-sm text-navy-900
                           placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    setResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-lg bg-navy-900 text-white text-sm font-semibold
                         hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* COLLAPSIBLE SEARCH RESULTS SECTION */}
      {hasSearched && (
        <div className="fade-in mt-6">
          {/* Collapsible Header Toggle */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-900">
                Search Results:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy-100 text-navy-800">
                {results.length} vehicle{results.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {results.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-600 bg-white border border-navy-200 hover:bg-navy-50 hover:text-navy-900 transition-colors shadow-sm"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expand Results</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse Results</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Collapsible Content */}
          {!isCollapsed && (
            <>
              {results.length > 0 ? (
                <div className="enterprise-card overflow-hidden border border-navy-200 shadow-sm">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-200 bg-navy-50/80">
                          <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Customer Name
                          </th>
                          <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Agreement No.
                          </th>
                          <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Registration No.
                          </th>
                          <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Vehicle Type / Model
                          </th>
                          <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-right px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((v) => (
                          <tr
                            key={v.id}
                            className="border-b border-navy-100 last:border-0 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                            onClick={() => setSelectedVehicle(v)}
                          >
                            <td className="px-5 py-4 font-semibold text-navy-900">
                              {searchType === "customer_name"
                                ? highlightMatch(v.customer_name, searchValue)
                                : v.customer_name}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-navy-700">
                              {searchType === "agreement_number"
                                ? highlightMatch(v.agreement_number, searchValue)
                                : v.agreement_number || "—"}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs font-bold text-navy-950">
                              {searchType === "registration_number" || searchType === "last_four"
                                ? highlightMatch(v.registration_number, searchValue)
                                : v.registration_number || "—"}
                            </td>
                            <td className="px-5 py-4 text-navy-700 text-xs">
                              <span className="font-semibold text-navy-800">{v.vehicle_type || "Truck"}</span>
                              {" · "}
                              {[v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ") || "Standard"}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                  v.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-navy-100 text-navy-600"
                                }`}
                              >
                                {v.status || "active"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                                <span>View Details</span>
                                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-navy-100">
                    {results.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 hover:bg-navy-50/80 transition-colors cursor-pointer"
                        onClick={() => setSelectedVehicle(v)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-navy-900 text-sm">
                            {searchType === "customer_name"
                              ? highlightMatch(v.customer_name, searchValue)
                              : v.customer_name}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              v.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-navy-100 text-navy-600"
                            }`}
                          >
                            {v.status || "active"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-navy-600 mb-2">
                          <div>
                            <span className="text-navy-400">Reg: </span>
                            <span className="font-mono font-bold text-navy-900">
                              {searchType === "registration_number" || searchType === "last_four"
                                ? highlightMatch(v.registration_number, searchValue)
                                : v.registration_number || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-navy-400">Agreement: </span>
                            <span className="font-mono">
                              {searchType === "agreement_number"
                                ? highlightMatch(v.agreement_number, searchValue)
                                : v.agreement_number || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-navy-100 text-xs">
                          <span className="text-navy-500">
                            {v.vehicle_type || "Truck"} · {[v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ")}
                          </span>
                          <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="enterprise-card p-12 text-center border border-navy-200">
                  <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-navy-400 mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-navy-800 mb-1">No matching vehicles found</h3>
                  <p className="text-xs text-navy-500 max-w-sm mx-auto">
                    We couldn&apos;t find any records matching &quot;{searchValue}&quot;. Try adjusting your search term
                    or switching to another search category.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* COMPLETE VEHICLE DETAILS MODAL */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-navy-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Modal Bar */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-navy-200 px-6 py-3.5 flex items-center justify-between z-20 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Vehicle File Record</h3>
                  <p className="text-[11px] text-navy-500 font-mono">ID: {selectedVehicle.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/vehicles/${selectedVehicle.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 transition-colors"
                  title="Open in dedicated page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Page</span>
                </Link>

                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-navy-100 hover:text-navy-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: VehicleDetailView (Handles Geolocation + Admin Notification) */}
            <div className="p-6">
              <VehicleDetailView
                vehicle={selectedVehicle}
                isAdmin={isAdmin}
                userId={userId}
                onClose={() => setSelectedVehicle(null)}
                onEdit={openEditModal}
                onDelete={() => setShowDeleteConfirm(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ADMIN ONLY: Add Vehicle Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-navy-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-enterprise-lg border border-navy-200 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-navy-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-navy-900">Add Vehicle Record</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-navy-400 hover:text-navy-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="enterprise-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Acme Logistics Corp"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Agreement Number</label>
                  <input
                    type="text"
                    value={formData.agreement_number}
                    onChange={(e) => setFormData({ ...formData, agreement_number: e.target.value })}
                    placeholder="AGR-1002"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="ABC 1234"
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Chassis Number</label>
                  <input
                    type="text"
                    value={formData.chassis_number}
                    onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                    placeholder="CHS987654"
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Engine Number</label>
                  <input
                    type="text"
                    value={formData.engine_number}
                    onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                    placeholder="ENG12345"
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Vehicle Type</label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    placeholder="e.g. Truck, Trailer, Van"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Make</label>
                  <input
                    type="text"
                    value={formData.vehicle_make}
                    onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                    placeholder="Toyota / Scania"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Model</label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    placeholder="Hilux / R450"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Year</label>
                  <input
                    type="number"
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                    placeholder="2024"
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="enterprise-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
                <div>
                  <label className="enterprise-label">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Headquarters"
                    className="enterprise-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="enterprise-label">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Optional notes"
                    className="enterprise-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="bg-navy-900 hover:bg-navy-800 text-white">
                  Save Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ONLY: Edit Vehicle Modal */}
      {showEditModal && selectedVehicle && (
        <div
          className="fixed inset-0 bg-navy-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-enterprise-lg border border-navy-200 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-navy-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-navy-900">Edit Vehicle Record</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-navy-400 hover:text-navy-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="enterprise-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Agreement Number</label>
                  <input
                    type="text"
                    value={formData.agreement_number}
                    onChange={(e) => setFormData({ ...formData, agreement_number: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Chassis Number</label>
                  <input
                    type="text"
                    value={formData.chassis_number}
                    onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Engine Number</label>
                  <input
                    type="text"
                    value={formData.engine_number}
                    onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                    className="enterprise-input font-mono"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Vehicle Type</label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Make</label>
                  <input
                    type="text"
                    value={formData.vehicle_make}
                    onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Model</label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="enterprise-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="enterprise-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
                <div>
                  <label className="enterprise-label">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="enterprise-label">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="bg-navy-900 hover:bg-navy-800 text-white">
                  Update Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ONLY: Delete Confirmation Modal */}
      {showDeleteConfirm && selectedVehicle && (
        <div
          className="fixed inset-0 bg-navy-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-enterprise-lg border border-navy-200 w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h3 className="text-lg font-bold text-navy-900 mb-2">Delete Vehicle Record?</h3>
            <p className="text-sm text-navy-600 mb-4 leading-relaxed">
              Are you sure you want to delete the vehicle record for{" "}
              <strong className="text-navy-900">{selectedVehicle.customer_name}</strong> (Reg:{" "}
              <span className="font-mono">{selectedVehicle.registration_number || "N/A"}</span>)?
              This action is permanent and will be logged in the administrative audit trail.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                loading={deleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
