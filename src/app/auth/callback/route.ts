import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_SUPABASE_URL = "https://cbawyuzqhxfqoyjhwpnc.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_qy_8m0bDYR9Kg9Gl_ZA99Q_AStcBwUO";

function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = forwardedHost || request.headers.get("host");

  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    return new URL(request.url).origin;
  }
  return `${forwardedProto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const origin = getPublicOrigin(request);
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = (searchParams.get("type") || "email") as EmailOtpType;
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const next = searchParams.get("next") ?? "/verify-email?status=success";

    // 1. If Supabase Auth redirected with an error query param
    if (errorParam || errorDesc) {
      const message = errorDesc || errorParam || "Verification failed";
      return NextResponse.redirect(
        new URL(`/verify-email?status=expired&error=${encodeURIComponent(message)}`, origin)
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

    // Build success response with cookie tracking
    const redirectUrl = new URL(next.startsWith("/") ? next : "/verify-email?status=success", origin);
    const successResponse = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options as Parameters<typeof successResponse.cookies.set>[2])
          );
        },
      },
    });

    // 2. PKCE Code Exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return successResponse;
      }

      // Check if session or user already active (e.g. pre-fetched by corporate mail scanner)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at || user?.confirmed_at) {
        return successResponse;
      }

      console.warn("[Auth Callback] PKCE exchange error:", error.message);
      return NextResponse.redirect(
        new URL(`/verify-email?status=expired&error=${encodeURIComponent(error.message)}`, origin)
      );
    }

    // 3. Token Hash / OTP Verification
    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        return successResponse;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at || user?.confirmed_at) {
        return successResponse;
      }

      console.warn("[Auth Callback] OTP verification error:", error.message);
      return NextResponse.redirect(
        new URL(`/verify-email?status=expired&error=${encodeURIComponent(error.message)}`, origin)
      );
    }

    // 4. No code and no token_hash: Could be an Implicit Grant URL hash (#access_token=...)
    // Browsers do NOT send URL hash fragments to the server in HTTP requests.
    // Return a lightweight client-side bridge that preserves the hash fragment and forwards to /verify-email.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verifying Identity...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b132b;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #1c2541;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
    p { font-size: 0.875rem; color: #94a3b8; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Verifying Your Account</h1>
    <p>Please wait while we confirm your security credentials...</p>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash;
        var search = window.location.search;
        if (hash && (hash.indexOf('access_token=') !== -1 || hash.indexOf('refresh_token=') !== -1)) {
          window.location.replace('/verify-email' + search + hash);
          return;
        }
        if (hash && (hash.indexOf('error=') !== -1 || hash.indexOf('error_code=') !== -1)) {
          window.location.replace('/verify-email?status=expired&' + hash.substring(1));
          return;
        }
      } catch (e) {
        console.error(e);
      }
      window.location.replace('/verify-email?status=expired');
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[Auth Callback] Unexpected error:", err);
    return NextResponse.redirect(
      new URL("/verify-email?status=expired&error=callback_error", getPublicOrigin(request))
    );
  }
}
