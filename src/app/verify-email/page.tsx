"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Shield,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status");
  const initialEmail = searchParams.get("email") || "";
  const errorParam = searchParams.get("error") || searchParams.get("error_description") || "";

  // Check if hash has access_token or errors initially
  const hasAccessTokenInHash =
    typeof window !== "undefined" &&
    (window.location.hash.includes("access_token=") ||
      window.location.hash.includes("type=signup") ||
      window.location.hash.includes("type=recovery"));

  const hasErrorInHash =
    typeof window !== "undefined" &&
    (window.location.hash.includes("error=access_denied") ||
      window.location.hash.includes("error_description="));

  const isPkceCrossDeviceError = Boolean(
    errorParam &&
      (errorParam.toLowerCase().includes("code verifier") ||
        errorParam.toLowerCase().includes("code_verifier") ||
        errorParam.toLowerCase().includes("different browser or device") ||
        errorParam.toLowerCase().includes("storage was cleared"))
  );

  const [status, setStatus] = useState<"pending" | "verifying" | "success" | "expired">(() => {
    if (isPkceCrossDeviceError) return "success";
    if (hasErrorInHash || errorParam) return "expired";
    if (hasAccessTokenInHash) return "verifying";
    if (initialStatusParam === "success") return "success";
    if (initialStatusParam === "expired") return "expired";
    return "pending";
  });

  const [errorMessage, setErrorMessage] = useState<string>(errorParam);
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Monitor Supabase Auth changes and hash tokens
  useEffect(() => {
    const supabase = createClient();

    // 1. Listen for auth state transitions (fires when Supabase client processes hash tokens)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        if (session?.user) {
          setStatus("success");
          if (session.user.email) setEmail(session.user.email);
        }
      }
    });

    // 2. Check active session or user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setStatus("success");
        if (session.user.email) setEmail(session.user.email);
      }
    });

    // 3. Inspect hash parameters for errors or cross-device verifier status
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (
        hash.includes("code_verifier") ||
        hash.includes("different+browser") ||
        hash.includes("different%20browser")
      ) {
        setStatus("success");
      } else if (hash.includes("error_description=")) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const desc = params.get("error_description");
          if (desc) {
            const decoded = decodeURIComponent(desc.replace(/\+/g, " "));
            if (
              decoded.toLowerCase().includes("code verifier") ||
              decoded.toLowerCase().includes("different browser")
            ) {
              setStatus("success");
            } else {
              setErrorMessage(decoded);
              setStatus("expired");
            }
          }
        } catch {
          // fallback
        }
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cooldown timer management with localStorage persistence
  useEffect(() => {
    if (!email) return;
    const key = `resend_cooldown_${email.toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const diff = Math.ceil((parseInt(saved, 10) - Date.now()) / 1000);
      if (diff > 0) {
        setCountdown(diff);
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (email) localStorage.removeItem(`resend_cooldown_${email.toLowerCase()}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, email]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Please provide your email address to resend the verification link");
      return;
    }

    if (countdown > 0) {
      toast.info(`Please wait ${countdown} seconds before requesting another email`);
      return;
    }

    setResending(true);
    try {
      const supabase = createClient();
      const redirectOrigin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://truck-tracking-zmfb.vercel.app";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${redirectOrigin}/auth/callback`,
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("already confirmed") || lower.includes("already verified")) {
          toast.success("This email is already verified! You can sign in now.");
          setStatus("success");
          return;
        }
        toast.error(error.message);
        return;
      }

      toast.success("Verification email resent successfully! Please check your inbox.");
      const cooldownSecs = 60;
      setCountdown(cooldownSecs);
      localStorage.setItem(
        `resend_cooldown_${email.toLowerCase().trim()}`,
        (Date.now() + cooldownSecs * 1000).toString()
      );
    } catch {
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Enterprise Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
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
            Identity &amp;
            <br />
            Security Verification
          </h1>
          <p className="text-navy-400 text-lg leading-relaxed mb-6">
            Mandatory email verification protects corporate asset tracking and ensures
            all activity is attributed to verified corporate identities.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-navy-300">
            <Shield className="w-5 h-5 text-blue-400 shrink-0" />
            <span>Zero-trust access policy enforced on all endpoints</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-navy-500 text-xs">
          <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          <span className="w-1 h-1 rounded-full bg-navy-700" />
          <span>Enterprise Security Protocol</span>
        </div>
      </div>

      {/* Right Panel — Dynamic Verification Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[440px]">
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

          {/* STATUS: VERIFYING (Temporary state while processing token or exchange) */}
          {status === "verifying" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Verifying Email...</h2>
              <p className="text-navy-500 text-sm leading-relaxed">
                Please wait while we validate your security credentials and confirm your account.
              </p>
            </div>
          )}

          {/* STATUS: SUCCESS */}
          {status === "success" && (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Email Verified Successfully</h2>
              <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm font-medium mb-6 leading-relaxed">
                Your email has been successfully verified! You can now log in.
                {isPkceCrossDeviceError && (
                  <p className="text-xs text-emerald-800 mt-2 font-normal leading-relaxed">
                    Because this link was opened on a mobile device or separate browser from where you registered, please enter your password to sign in.
                  </p>
                )}
                {email && (
                  <div className="text-xs text-emerald-800 font-mono mt-1">
                    Account: {email}
                  </div>
                )}
              </div>
              <p className="text-navy-500 text-sm mb-8 leading-relaxed">
                Your credentials and security permissions are now activated. Proceed to the sign-in screen to access your dashboard.
              </p>

              <Link href="/login?verified=true">
                <Button className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-semibold flex items-center justify-center gap-2">
                  Proceed to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* STATUS: PENDING (Default after signup) */}
          {status === "pending" && (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>

              <h2 className="text-2xl font-bold text-navy-900 mb-2">Check Your Email</h2>

              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 mb-6">
                <p className="text-sm font-medium text-navy-800 leading-relaxed">
                  Registration successful! Please check your email and verify your account before logging in.
                </p>
                {email && (
                  <p className="text-xs text-navy-600 mt-2 font-mono bg-white/80 p-2 rounded border border-blue-100">
                    Sent to: <span className="font-semibold text-navy-900">{email}</span>
                  </p>
                )}
              </div>

              <p className="text-navy-500 text-xs mb-6 leading-relaxed">
                Click the confirmation link sent to your inbox to activate your account. If you do not see the email, please check your spam or junk folder.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  variant="outline"
                  className="w-full h-11 border-navy-200 text-navy-800 hover:bg-navy-50 font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend email in ${countdown}s` : "Resend Verification Email"}
                </Button>

                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full h-11 text-navy-600 hover:text-navy-900">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* STATUS: EXPIRED OR INVALID */}
          {status === "expired" && (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>

              <h2 className="text-2xl font-bold text-navy-900 mb-2">Verification Link Expired</h2>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-6 leading-relaxed">
                {errorMessage ||
                  "This verification link is invalid or has expired. For security, verification tokens expire after a limited period."}
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="resendEmail" className="enterprise-label">
                    Email Address
                  </label>
                  <input
                    id="resendEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="enterprise-input"
                  />
                </div>

                <Button
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : "Send New Verification Link"}
                </Button>
              </div>

              <Link href="/login" className="block">
                <Button variant="outline" className="w-full h-11 border-navy-200 text-navy-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* Security note */}
          <div className="mt-8 pt-6 border-t border-navy-100 flex items-start gap-3 text-xs text-navy-400">
            <Shield className="w-4 h-4 text-navy-400 shrink-0 mt-0.5" />
            <p>
              Corporate access protocol requires two-step verified registration. Account access is monitored and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
