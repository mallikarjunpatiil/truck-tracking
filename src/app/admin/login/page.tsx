"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Truck,
  Server,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { userLoginSchema } from "@/lib/validations";
import { ADMIN_EMAILS } from "@/lib/constants";

function AdminLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = userLoginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      let targetEmail = identifier.trim();

      // 1. Resolve User ID / Email via server
      const lookupRes = await fetch("/api/auth/lookup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: targetEmail }),
      });

      const lookupData = await lookupRes.json();

      if (!lookupRes.ok) {
        toast.error(lookupData.error || "Authentication lookup failed");
        setLoading(false);
        return;
      }

      if (lookupData.active === false) {
        toast.error("This account has been deactivated. Contact the system owner.");
        setLoading(false);
        return;
      }

      if (lookupData.email) {
        targetEmail = lookupData.email;
      }

      // Check if user is known non-admin in profile lookup
      if (
        lookupData.role &&
        lookupData.role !== "admin" &&
        !ADMIN_EMAILS.includes(targetEmail.toLowerCase())
      ) {
        toast.error("Access Denied: Administrator or owner privileges required.");
        setLoading(false);
        return;
      }

      // 2. Authenticate with Supabase Auth
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      // 3. Mandatory server-side verified admin check
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      const isDesignatedAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

      if (!isDesignatedAdmin && profile?.role !== "admin") {
        // Sign out unauthorized user immediately
        await supabase.auth.signOut();
        toast.error("Access Denied: Your account does not have administrator privileges.");
        setLoading(false);
        return;
      }

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        toast.error("Account deactivated.");
        setLoading(false);
        return;
      }

      toast.success("Welcome to Admin Dashboard!");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred during administrative authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold tracking-tight text-base">TRUCK TRACKING</span>
            <span className="text-blue-400 font-bold ml-1 text-base">ADMIN</span>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-semibold text-navy-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-800 hover:border-navy-700 bg-navy-900/50"
        >
          <span>Normal User Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-12 bg-navy-900 border border-navy-800 rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 mb-6 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">Administrator Portal</h1>
          <p className="text-xs text-navy-400 mt-1 mb-8 leading-relaxed">
            Secure management console. Restricted to authorized fleet owners and administrative operators.
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-navy-300 uppercase tracking-wider block mb-1.5">
                Admin User ID or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. ADMIN-001 or admin@company.com"
                  autoComplete="username"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-navy-700 bg-navy-950 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors font-mono"
                />
              </div>
              {errors.identifier && <p className="text-xs text-red-400 mt-1">{errors.identifier}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-300 uppercase tracking-wider block mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-navy-700 bg-navy-950 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying Credentials…
                </>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security advisory */}
          <div className="mt-8 pt-6 border-t border-navy-800/80 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-navy-400 leading-relaxed">
              Every sign-in attempt and database modification is immutably logged with source IP, timestamp, and geolocation verification.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center py-2 text-xs text-navy-500">
        <span>© {new Date().getFullYear()} Truck Tracking Master · Enterprise Administrative Console</span>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
