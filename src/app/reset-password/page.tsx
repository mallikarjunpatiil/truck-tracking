"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, Mail, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = resetPasswordSchema.safeParse({ email });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Gradient accents */}
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
            Account
            <br />
            Recovery
          </h1>
          <p className="text-navy-400 text-lg leading-relaxed">
            Reset your password securely. We&apos;ll send a password reset link
            to your registered email address.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-6 text-navy-500 text-xs">
          <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          <span className="w-1 h-1 rounded-full bg-navy-700" />
          <span>Enterprise Edition</span>
        </div>
      </div>

      {/* Right Panel — Reset Form */}
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

          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-navy-500 hover:text-navy-700 transition-colors mb-8 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {sent ? (
            /* Success State */
            <div>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2 text-center">Check your email</h2>
              <p className="text-navy-500 text-sm text-center mb-8">
                We&apos;ve sent a password reset link to{" "}
                <strong className="text-navy-700">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11 font-semibold">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            /* Reset Form */
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Reset your password</h2>
                <p className="text-navy-500 text-sm">
                  Enter the email address associated with your account and
                  we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label htmlFor="email" className="enterprise-label">Email Address</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-semibold"
                  size="lg"
                >
                  Send Reset Link
                </Button>
              </form>
            </div>
          )}

          {/* Security notice */}
          <div className="mt-8 p-4 rounded-lg bg-navy-50 border border-navy-200">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-navy-700 mb-0.5">Secure Recovery</p>
                <p className="text-xs text-navy-500 leading-relaxed">
                  Password reset links expire after 1 hour for security.
                  If you didn&apos;t request this reset, please contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
