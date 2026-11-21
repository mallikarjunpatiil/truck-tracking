import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route is protected
  const isAdminLogin = pathname === "/admin/login";
  const isProtected =
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) && !isAdminLogin;
  const isAuthPage = pathname === "/login" || pathname === "/register" || isAdminLogin;

  // Fast-path: Check for Supabase auth cookie presence
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  // If public route and no auth cookie, return immediately (zero latency)
  if (!isProtected && !isAuthPage && !hasAuthCookie) {
    return NextResponse.next();
  }

  // If protected route and definitely no auth cookie, redirect to login immediately
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Create server client only when necessary
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

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
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "unverified");
      url.searchParams.set("email", user.email || "");
      return NextResponse.redirect(url);
    }
  }

  // Admin-only route protection
  if (pathname.startsWith("/admin") && user) {
    const isSuperAdmin = Boolean(
      user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
    );

    if (!isSuperAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/access-denied";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect verified logged-in users away from auth pages
  if (isAuthPage && user) {
    const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
    if (isEmailVerified) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
