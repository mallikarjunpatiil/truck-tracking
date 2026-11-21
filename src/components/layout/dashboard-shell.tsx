"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Truck,
  LayoutDashboard,
  Search,
  Upload,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Settings,
  History,
  FileText,
  ChevronLeft,
  User,
  Copy,
  Check,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAILS } from "@/lib/constants";
import type { Profile } from "@/types/database";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface DashboardShellProps {
  children: React.ReactNode;
  user: SupabaseUser;
  profile: Profile;
}

const userNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/search", label: "Vehicle Search", icon: Search },
  { href: "/dashboard/history", label: "Search History", icon: History },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/upload", label: "Excel Upload", icon: Upload },
  { href: "/admin/access-logs", label: "Access History", icon: Eye },
  { href: "/admin/logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children, user, profile }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = profile.role === "admin";
  const isOwner = Boolean(user.email && (user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com" || ADMIN_EMAILS.includes(user.email.toLowerCase())));
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  const userIdCode = profile.user_id_code || `USR-${user.id.slice(0, 6).toUpperCase()}`;

  // Close profile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userIdCode);
    setCopiedId(true);
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Mobile nav overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy-900/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HIDEABLE USER PROFILE DRAWER (Opens from Top-Left)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setProfileDrawerOpen(false)}
          />

          {/* Slide-over Profile Drawer from Left */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-sm bg-white border-r border-navy-200 shadow-enterprise-xl flex flex-col justify-between slide-right">
              {/* Drawer Header */}
              <div>
                <div className="px-6 py-5 border-b border-navy-100 flex items-center justify-between bg-navy-900 text-white">
                  <div className="flex items-center gap-2.5">
                    <User className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-base tracking-tight">User Profile</h3>
                  </div>
                  <button
                    onClick={() => setProfileDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Card & Avatar */}
                <div className="p-6 border-b border-navy-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-navy-900 text-white flex items-center justify-center text-xl font-bold border-2 border-blue-500 shadow-md">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-navy-900 truncate">
                        {profile.full_name || "Enterprise User"}
                      </h4>
                      <p className="text-xs text-navy-500 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isOwner
                              ? "bg-purple-100 text-purple-800"
                              : isAdmin
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {isOwner ? "Owner / SuperAdmin" : isAdmin ? "Administrator" : "Standard User"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Details List */}
                <div className="p-6 space-y-4">
                  {/* User ID with copy button */}
                  <div>
                    <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider block mb-1">
                      Assigned User ID
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-navy-50 border border-navy-200">
                      <span className="font-mono text-sm font-bold text-navy-900">{userIdCode}</span>
                      <button
                        onClick={handleCopyUserId}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {copiedId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-navy-400">Email Address</p>
                        <p className="font-medium text-navy-800 text-xs break-all">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-navy-400">Registered Phone</p>
                        <p className="font-medium text-navy-800 text-xs">
                          {profile.phone_number || "Not Registered"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-navy-400">Account Created</p>
                        <p className="font-medium text-navy-800 text-xs">
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm">
                      <Clock className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-navy-400">Current Session</p>
                        <p className="font-medium text-navy-800 text-xs">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString() +
                              " " +
                              new Date(user.last_sign_in_at).toLocaleTimeString()
                            : "Authenticated"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer with Logout Button */}
              <div className="p-6 border-t border-navy-100 bg-navy-50/50">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out from Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN SIDEBAR NAVIGATION                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-white border-r border-navy-200 transition-all duration-200 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-[72px]" : "lg:w-64"} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-navy-100">
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col whitespace-nowrap">
                  <span className="text-sm font-bold text-navy-900 leading-none tracking-tight">TRUCK TRACKING</span>
                  <span className="text-[10px] font-semibold text-blue-600 leading-none mt-0.5 tracking-wide">MASTER</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-navy-400 hover:text-navy-700"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
            >
              <ChevronLeft
                className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
            {/* User Navigation */}
            <div className="space-y-1">
              {userNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-navy-600 hover:bg-navy-100 hover:text-navy-900"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-blue-600" : ""}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Admin-Only Navigation */}
            {isAdmin && (
              <>
                <div className={`my-4 mx-1 h-px bg-navy-200 ${collapsed ? "mx-2" : ""}`} />
                {!collapsed && (
                  <p className="px-3 text-[11px] font-semibold text-navy-400 uppercase tracking-wider mb-2">
                    Administration
                  </p>
                )}
                <div className="space-y-1">
                  {adminNav.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-navy-600 hover:bg-navy-100 hover:text-navy-900"
                        } ${collapsed ? "justify-center px-0" : ""}`}
                      >
                        <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-blue-600" : ""}`} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>

          {/* User Card in Sidebar (Click to open Profile Drawer) */}
          {!collapsed && (
            <div className="p-3 border-t border-navy-100">
              <button
                type="button"
                onClick={() => setProfileDrawerOpen(true)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-navy-50 hover:bg-navy-100 transition-colors border border-navy-200/60"
              >
                <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {profile.full_name || "User"}
                  </p>
                  <p className="text-[11px] text-navy-500 font-mono truncate">{userIdCode}</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN VIEWPORT & TOPBAR                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-navy-200 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Nav Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-navy-500 hover:text-navy-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* TOP-LEFT HIDEABLE USER PROFILE BUTTON */}
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-navy-50 border border-navy-200 hover:bg-navy-100 hover:border-navy-300 transition-all text-left"
              title="Click to view your profile and account details"
            >
              <div className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-navy-900 block leading-tight">
                  {profile.full_name?.split(" ")[0] || "Profile"}
                </span>
                <span className="text-[10px] text-navy-500 font-mono block leading-none">
                  {userIdCode}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-navy-400" />
            </button>

            {/* Page title */}
            <div className="hidden md:block pl-2 border-l border-navy-200">
              <h1 className="text-sm font-semibold text-navy-800">
                {[...userNav, ...adminNav].find((n) => n.href === pathname)?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              href={isAdmin ? "/admin/access-logs" : "/dashboard/history"}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-navy-500 hover:bg-navy-100 hover:text-navy-700 transition-colors"
              title={isAdmin ? "View live access history" : "Search history"}
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </Link>

            {/* Quick Logout */}
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
