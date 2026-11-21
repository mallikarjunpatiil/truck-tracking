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

    const body = await request.json();
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 });
    }

    const { email, password, full_name, role, user_id_code, phone_number } = result.data;

    // Use service role client to create user (never exposed to frontend)
    const adminClient = await createServiceRoleClient();
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, phone_number },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Insert or update profile
    const profilePayload: Record<string, unknown> = {
      id: newUser.user.id,
      email,
      full_name,
      role,
      is_active: true,
    };
    if (user_id_code) profilePayload.user_id_code = user_id_code;
    if (phone_number) profilePayload.phone_number = phone_number;

    await adminClient.from("profiles").upsert(profilePayload);

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "user_created",
      resource_type: "user",
      resource_id: newUser.user.id,
      details: { email, role },
    });

    return NextResponse.json({ success: true, userId: newUser.user.id });
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: users, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
