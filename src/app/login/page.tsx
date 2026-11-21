"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  MapPin,
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { userLoginSchema } from "@/lib/validations";

function LoginForm() {
  const searchParams = useSearchParams();
  const verifiedParam = searchParams.get("verified") === "true";
  const errorParam = searchParams.get("error");
  const identifierParam = searchParams.get("email") || searchParams.get("userId") || "";

  const [identifier, setIdentifier] = useState(identifierParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
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

      // Resolve custom User ID or check account status via backend
      const lookupRes = await fetch("/api/auth/lookup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: targetEmail }),
      });

      const lookupData = await lookupRes.json();

      if (!lookupRes.ok) {
        toast.error(lookupData.error || "Failed to verify account");
        setLoading(false);
        return;
      }

      if (lookupData.active === false) {
        toast.error(lookupData.error || "Account deactivated. Please contact an administrator.");
        setLoading(false);
        return;
      }

      if (lookupData.email) {
        targetEmail = lookupData.email;
        setResolvedEmail(lookupData.email);
      }

      // Authenticate with Supabase Auth
      const supabase = createClient();
      let { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      // If Supabase returned unconfirmed, attempt auto-confirm and retry
      if (
        error &&
        (error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("unconfirmed") ||
          (error as unknown as { code?: string }).code === "email_not_confirmed")
      ) {
        try {
          const autoRes = await fetch("/api/auth/auto-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail }),
          });
          const autoData = await autoRes.json();
          if (autoData.confirmed) {
            const retry = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password,
            });
            data = retry.data;
            error = retry.error;
          }
        } catch {
          // ignore
        }
      }

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        toast.error("Sign in failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      const user = data.user;

      // Double-check profile is_active
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, role")
        .eq("id", user.id)
        .single();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        toast.error("Account deactivated. Please contact an administrator.");
        return;
      }

      // Ensure profile has admin role
      if (profile && profile.role !== "admin") {
        await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
      }

      toast.success("Welcome back!");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Visual Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/8 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">TRUCK TRACKING</span>
              <span className="text-blue-400 font-bold text-lg ml-1">MASTER</span>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Enterprise Fleet
            <br />
            Management System
          </h1>
          <p className="text-navy-400 text-lg leading-relaxed mb-10">
            Secure vehicle tracking, customer data management, and comprehensive
            audit trails for transportation and finance companies.
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, text: "Mandatory Verified Access" },
              { icon: MapPin, text: "Vehicle Tracking & Search" },
              { icon: BarChart3, text: "Real-Time Analytics" },
              { icon: Users, text: "Multi-User Role Security" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <f.icon className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-sm text-navy-300 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-6 text-navy-500 text-xs">
          <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          <span className="w-1 h-1 rounded-full bg-navy-700" />
          <span>Enterprise Edition</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-navy-900 font-bold tracking-tight">TRUCK TRACKING</span>
              <span className="text-blue-600 font-bold ml-1">MASTER</span>
            </div>
          </div>

          {/* SUCCESS BANNER: Verified */}
          {verifiedParam && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Email Verified</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your email has been successfully verified. You can now log in.
                </p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy-900 mb-1">User Sign In</h2>
            <p className="text-navy-500 text-sm">Enter your User ID or Email to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="enterprise-label">User ID or Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. USR-1002 or name@company.com"
                  autoComplete="username"
                  className={`enterprise-input pl-10 ${errors.identifier ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : ""}`}
                />
              </div>
              {errors.identifier && <p className="text-xs text-red-600 mt-1.5">{errors.identifier}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-navy-700">Password</label>
                <Link href="/reset-password" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`enterprise-input pl-10 pr-10 ${errors.password ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1.5">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-navy-900 text-white text-sm font-semibold
                         hover:bg-navy-800 active:bg-navy-950 transition-colors duration-150
                         disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-navy-500">
              Need access?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* Security notice */}
          <div className="mt-6 p-4 rounded-lg bg-navy-50 border border-navy-200">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-navy-700 mb-0.5">Authorized Fleet Access Only</p>
                <p className="text-xs text-navy-500 leading-relaxed">
                  This system is restricted to verified personnel. Access to vehicle records is
                  monitored, audited, and logged with geolocation verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
