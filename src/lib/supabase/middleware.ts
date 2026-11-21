import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants";

// Fallbacks prevent 500 MIDDLEWARE_INVOCATION_FAILED on Vercel if environment variables are not yet configured in project settings
const DEFAULT_SUPABASE_URL = "https://cbawyuzqhxfqoyjhwpnc.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_qy_8m0bDYR9Kg9Gl_ZA99Q_AStcBwUO";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Determine route classifications
  const isAdminLogin = pathname === "/admin/login";
  const isProtected =
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) && !isAdminLogin;
  const isAuthPage = pathname === "/login" || pathname === "/register" || isAdminLogin;

  // Fast-path: Check for Supabase auth cookie presence
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  // If user visits an auth page (like /login or /admin/login) and has no auth cookie,
  // do NOT invoke Supabase server client. Serve the page immediately without latency.
  if (isAuthPage && !hasAuthCookie) {
    return NextResponse.next();
  }

  // If public route and no auth cookie, return immediately
  if (!isProtected && !hasAuthCookie) {
    return NextResponse.next();
  }

  // If protected route and definitely no auth cookie, redirect to login immediately
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtected) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }

      // Mandatory email verification check
      const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
      if (!isEmailVerified) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "unverified");
        url.searchParams.set("email", user.email || "");
        return NextResponse.redirect(url);
      }
    }

    // Redirect verified logged-in users away from auth pages
    if (isAuthPage && user) {
      const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
      if (isEmailVerified) {
        const isSuperAdmin = Boolean(
          user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
        );
        const url = request.nextUrl.clone();
        url.pathname = isSuperAdmin && isAdminLogin ? "/admin" : "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error("[Middleware updateSession caught error]", err);
    // On unexpected error, if accessing protected route, safely redirect to login
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
