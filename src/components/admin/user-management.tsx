"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, Shield, UserX, UserCheck, X, Search, Phone, Hash } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "user",
    user_id_code: "",
    phone_number: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  const loadUsers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Name, email, and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      toast.success("User account created successfully");
      setShowAdd(false);
      setForm({ email: "", full_name: "", password: "", role: "user", user_id_code: "", phone_number: "" });
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: Profile) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      toast.success(`User ${u.is_active ? "deactivated" : "activated"}`);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete user");
      return;
    }
    toast.success("User deleted");
    setDeleteTarget(null);
    loadUsers();
  };

  const filtered = users.filter(
    (u) =>
      !filter ||
      u.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      u.user_id_code?.toLowerCase().includes(filter.toLowerCase()) ||
      u.phone_number?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <div className="enterprise-card">
        <div className="px-5 py-4 border-b border-navy-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-navy-500" />
            <h3 className="font-semibold text-navy-900 text-sm">User &amp; Personnel Registry</h3>
            <span className="text-xs text-navy-400 ml-1">({users.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name, ID, phone…"
                className="h-9 pl-9 pr-3 rounded-lg border border-navy-300 bg-white text-xs text-navy-800 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-52"
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add User
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-navy-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-200 bg-navy-50/80">
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      User / Name
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      User ID Code
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-navy-600 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-navy-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-navy-200 flex items-center justify-center text-xs font-semibold text-navy-700">
                            {u.full_name
                              ? u.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-navy-900 block text-xs">{u.full_name || "—"}</span>
                            <span className="text-[11px] text-navy-500 font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-navy-800 bg-navy-100 px-2 py-0.5 rounded">
                          {u.user_id_code || u.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-700 text-xs font-mono">
                        {u.phone_number || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            u.role === "admin"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-navy-100 text-navy-700"
                          }`}
                        >
                          {u.role === "admin" && <Shield className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-500 text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-navy-600 hover:bg-navy-100 transition-colors"
                          >
                            {u.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" /> Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-navy-100">
              {filtered.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-navy-200 flex items-center justify-center text-xs font-semibold text-navy-700">
                        {u.full_name ? u.full_name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-navy-900 text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-navy-500">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-navy-600 font-mono">
                    <span>ID: {u.user_id_code || u.id.slice(0, 8)}</span>
                    {u.phone_number && <span>· Phone: {u.phone_number}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="flex-1 h-8 rounded-md border border-navy-200 text-xs font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="h-8 px-3 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add User Dialog */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-navy-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-xl border border-navy-200 shadow-enterprise-lg w-full max-w-md slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-200">
              <h3 className="font-semibold text-navy-900">Add New User</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-navy-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="enterprise-label">Full Name *</label>
                <input
                  className="enterprise-input"
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="enterprise-label">Email Address *</label>
                <input
                  className="enterprise-input"
                  type="email"
                  placeholder="user@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="enterprise-label">User ID Code</label>
                  <input
                    className="enterprise-input font-mono"
                    placeholder="e.g. USR-1002"
                    value={form.user_id_code}
                    onChange={(e) => setForm({ ...form, user_id_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="enterprise-label">Phone Number</label>
                  <input
                    className="enterprise-input font-mono"
                    placeholder="+91 9876543210"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="enterprise-label">Password *</label>
                <input
                  className="enterprise-input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="enterprise-label">Role</label>
                <select
                  className="enterprise-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">User (Normal)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 h-10 rounded-lg border border-navy-300 text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-10 rounded-lg bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-navy-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl border border-navy-200 shadow-enterprise-lg w-full max-w-sm p-6 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-navy-900 mb-2">Delete User?</h3>
            <p className="text-sm text-navy-500 mb-6">
              This will permanently remove <strong className="text-navy-800">{deleteTarget.full_name || deleteTarget.email}</strong> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-lg border border-navy-300 text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
