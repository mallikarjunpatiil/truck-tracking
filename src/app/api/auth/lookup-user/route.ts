import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const trimmed = identifier.trim();

    const hasServiceRoleKey =
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key-here" &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder");

    // If identifier has @ (it's an email)
    if (trimmed.includes("@")) {
      // If service role key is available, check is_active
      if (hasServiceRoleKey) {
        try {
          const serviceClient = await createServiceRoleClient();
          const { data: profile } = await serviceClient
            .from("profiles")
            .select("is_active, role, user_id_code")
            .ilike("email", trimmed)
            .maybeSingle();

          if (profile && profile.is_active === false) {
            return NextResponse.json(
              { error: "This account has been deactivated. Please contact an administrator.", active: false },
              { status: 403 }
            );
          }
        } catch (e) {
          console.warn("[lookup-user check skipped]", e);
        }
      }
      return NextResponse.json({ email: trimmed, active: true });
    }

    // Custom User ID lookup without @
    if (!hasServiceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Custom User ID sign-in requires SUPABASE_SERVICE_ROLE_KEY configuration in .env.local. Please enter your registered email address instead.",
        },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceRoleClient();

    // Check by user_id_code (case-insensitive) or email
    const { data: profile, error } = await serviceClient
      .from("profiles")
      .select("id, email, is_active, user_id_code, role")
      .or(`user_id_code.ilike.${trimmed},email.ilike.${trimmed}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[lookup-user error]", error);
      return NextResponse.json({ error: "Failed to verify identifier" }, { status: 500 });
    }

    if (!profile) {
      // If user typed an email that doesn't exist yet, we still let supabase.auth handle the auth attempt
      // but if they typed a custom User ID (no @), return a helpful error
      if (!trimmed.includes("@")) {
        return NextResponse.json(
          { error: `User ID "${trimmed}" not found. Please check your User ID or use your registered email.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ email: trimmed, active: true });
    }

    if (profile.is_active === false) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact an administrator.", active: false },
        { status: 403 }
      );
    }

    const isAdmin = Boolean(profile.email && profile.email.toLowerCase() === "mallikarjun.patil8638@gmail.com");
    return NextResponse.json({
      email: profile.email,
      active: true,
      userIdCode: profile.user_id_code,
      role: isAdmin ? "admin" : (profile.role || "user"),
    });
  } catch (err) {
    console.error("[lookup-user exception]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
