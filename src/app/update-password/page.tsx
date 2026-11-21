"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Lock, Eye, EyeOff, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validations";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = updatePasswordSchema.safeParse({ password, confirmPassword });
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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      router.push("/dashboard");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getStrength = (pw: string): { label: string; color: string; width: string } => {
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
      {/* Left Panel — Visual Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
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
            Set New
            <br />
            Password
          </h1>
          <p className="text-navy-400 text-lg leading-relaxed">
            Create a strong, unique password for your account.
            Your password must include uppercase and lowercase letters, numbers,
            and be at least 8 characters.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-6 text-navy-500 text-xs">
          <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          <span className="w-1 h-1 rounded-full bg-navy-700" />
          <span>Enterprise Edition</span>
        </div>
      </div>

      {/* Right Panel — Update Password Form */}
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

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900 mb-2">Set new password</h2>
            <p className="text-navy-500 text-sm">
              Choose a strong password that you haven&apos;t used before.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="enterprise-label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 z-10" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, upper, lower, number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2.5">
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.label === "Weak" ? "text-red-600" :
                    strength.label === "Fair" ? "text-amber-600" :
                    strength.label === "Good" ? "text-blue-600" :
                    "text-emerald-600"
                  }`}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="enterprise-label">Confirm Password</label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 z-10" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`enterprise-input pl-10 pr-10 ${errors.confirmPassword ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : ""}`}
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
              {errors.confirmPassword && <p className="text-xs text-red-600 mt-1.5">{errors.confirmPassword}</p>}
              {confirmPassword && password && confirmPassword === password && !errors.confirmPassword && (
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-semibold"
              size="lg"
            >
              Update Password
            </Button>
          </form>

          {/* Password requirements */}
          <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs font-semibold text-navy-700 mb-2">Password Requirements</p>
            <ul className="space-y-1">
              {[
                { met: password.length >= 8, text: "At least 8 characters" },
                { met: /[A-Z]/.test(password), text: "One uppercase letter" },
                { met: /[a-z]/.test(password), text: "One lowercase letter" },
                { met: /[0-9]/.test(password), text: "One number" },
              ].map((req) => (
                <li key={req.text} className={`text-xs flex items-center gap-2 ${req.met ? "text-emerald-600" : "text-navy-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${req.met ? "bg-emerald-500" : "bg-navy-300"}`} />
                  {req.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Security notice */}
          <div className="mt-4 p-4 rounded-lg bg-navy-50 border border-navy-200">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-navy-700 mb-0.5">Security Notice</p>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Never share your password with anyone. Our team will never ask
                  for your password via email or phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
