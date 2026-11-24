import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createUserSchema } from "@/lib/validations";

// POST /api/admin/users — create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!isSuperAdmin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 });
    }

    const { email, password, full_name, role, user_id_code, phone_number } = result.data;

    let createdUserId: string | null = null;
    let createErrorMsg: string | null = null;

    // 1. Try service role admin client first if service role key is configured
    const hasServiceRoleKey =
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes("your-") &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder");

    if (hasServiceRoleKey) {
      try {
        const adminClient = await createServiceRoleClient();
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role, phone_number, user_id_code },
        });

        if (!createError && newUser?.user) {
          createdUserId = newUser.user.id;
        } else if (createError) {
          createErrorMsg = createError.message;
        }
      } catch (err: unknown) {
        createErrorMsg = err instanceof Error ? err.message : "Service role admin creation failed";
      }
    }

    // 2. Fallback to signUp if service role key is not configured or failed with Bearer token error
    if (!createdUserId) {
      const { createClient } = await import("@supabase/supabase-js");
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbawyuzqhxfqoyjhwpnc.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qy_8m0bDYR9Kg9Gl_ZA99Q_AStcBwUO",
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role,
            phone_number,
            user_id_code,
          },
        },
      });

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      if (signUpData?.user) {
        createdUserId = signUpData.user.id;
      } else {
        return NextResponse.json(
          { error: createErrorMsg || "User registration could not be completed" },
          { status: 400 }
        );
      }
    }

    // 3. Upsert profile in public.profiles table using current admin session
    const profilePayload: Record<string, unknown> = {
      id: createdUserId,
      email,
      full_name,
      role: role || "user",
      is_active: true,
    };
    if (user_id_code) profilePayload.user_id_code = user_id_code;
    if (phone_number) profilePayload.phone_number = phone_number;

    await supabase.from("profiles").upsert(profilePayload);

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "user_created",
      resource_type: "user",
      resource_id: createdUserId,
      details: { email, role, full_name },
    });

    return NextResponse.json({ success: true, userId: createdUserId });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/admin/users — list all users (admin only)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!isSuperAdmin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: users, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
