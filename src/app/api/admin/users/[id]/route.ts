import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!isSuperAdmin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const adminClient = await createServiceRoleClient();
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "user_deleted",
      resource_type: "user",
      resource_id: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] — update role or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!isSuperAdmin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { role, is_active } = body;

    // Validate role — never allow self-promotion
    if (id === user.id && role === "admin") {
      return NextResponse.json({ error: "Cannot modify your own role" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (role && ["admin", "user"].includes(role)) updates.role = role;

    const { error } = await supabase.from("profiles").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
