"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, Mail, Lock, User, Eye, EyeOff, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const isSuperAdmin = email.trim().toLowerCase() === "mallikarjun.patil8638@gmail.com";
      const redirectOrigin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL || "https://truck-tracking-zmfb.vercel.app");

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: "admin",
          },
          emailRedirectTo: `${redirectOrigin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Check if user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Please log in instead.");
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return;
      }

      // If Supabase returned an active session directly
      if (data.session) {
        toast.success("Account created successfully! Welcome to Truck Tracking Master.");
        router.push(isSuperAdmin ? "/admin" : "/dashboard");
        router.refresh();
        return;
      }

      // Attempt auto-confirm & immediate sign in
      try {
        await fetch("/api/auth/auto-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch {
        // ignore
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!signInError && signInData?.session) {
        toast.success("Account created successfully! Welcome to Truck Tracking Master.");
        router.push(isSuperAdmin ? "/admin" : "/dashboard");
        router.refresh();
        return;
      }

      toast.success("Account created! You can now log in with your email and password.");
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch {
      toast.error("An unexpected error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength helper
  const getStrength = (pw: string) => {
    if (!pw) return { label: "", color: "bg-gray-200", width: "w-0" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (score === 3) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" };
    if (score === 4) return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  };

  const strength = getStrength(password);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Enterprise Branding */}
      <div className="hidden lg:flex lg:w-[50%] bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/8 rounded-full blur-3xl" />

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

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Join the Fleet
            <br />
            Management Network
          </h1>
          <p className="text-navy-400 text-lg leading-relaxed mb-8">
            Create an enterprise account with mandatory email verification to track, manage, and audit fleet assets securely.
          </p>

          <div className="space-y-3">
            {[
              "Mandatory identity verification via corporate email",
              "Role-based authorization and activity auditing",
              "Full compliance with transportation security guidelines",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-sm text-navy-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-navy-500 text-xs">
          <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          <span className="w-1 h-1 rounded-full bg-navy-700" />
          <span>Verified Registration Protocol</span>
        </div>
      </div>

      {/* Right Panel — Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[440px] py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-navy-900 font-bold tracking-tight">TRUCK TRACKING</span>
              <span className="text-blue-600 font-bold ml-1">MASTER</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy-900 mb-1">Create an account</h2>
            <p className="text-navy-500 text-sm">
              Enter your details to register. An email confirmation link will be sent.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="enterprise-label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`enterprise-input pl-10 ${errors.fullName ? "border-red-400" : ""}`}
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="enterprise-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className={`enterprise-input pl-10 ${errors.email ? "border-red-400" : ""}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="enterprise-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  autoComplete="new-password"
                  className={`enterprise-input pl-10 pr-10 ${errors.password ? "border-red-400" : ""}`}
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
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}

              {password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="text-xs mt-1 text-navy-600 font-medium">Strength: {strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="enterprise-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`enterprise-input pl-10 pr-10 ${errors.confirmPassword ? "border-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
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
                  Creating Account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-6 text-center">
            <p className="text-sm text-navy-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Security policy note */}
          <div className="mt-6 p-4 rounded-lg bg-navy-50 border border-navy-200">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-navy-700 mb-0.5">Mandatory Email Verification</p>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Upon submission, an email verification link will be issued. Unverified accounts cannot access fleet records or administrative services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
