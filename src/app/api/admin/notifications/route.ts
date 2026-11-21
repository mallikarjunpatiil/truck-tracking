import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/notifications — list access notifications with filters and unread count
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const statusFilter = searchParams.get("status") || ""; // 'granted', 'denied', 'unread'
    const queryTerm = searchParams.get("query")?.trim() || "";

    let query = supabase
      .from("vehicle_access_logs")
      .select("*", { count: "exact" })
      .order("accessed_at", { ascending: false });

    if (statusFilter === "unread") {
      query = query.eq("is_read", false);
    } else if (statusFilter === "granted" || statusFilter === "denied") {
      query = query.eq("location_status", statusFilter);
    }

    if (queryTerm) {
      query = query.or(
        `user_name.ilike.%${queryTerm}%,customer_name.ilike.%${queryTerm}%,registration_number.ilike.%${queryTerm}%,user_phone.ilike.%${queryTerm}%,agreement_number.ilike.%${queryTerm}%`
      );
    }

    const { data: notifications, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("vehicle_access_logs")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (err) {
    console.error("Notifications GET exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/notifications — mark one or all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      await supabase
        .from("vehicle_access_logs")
        .update({ is_read: true })
        .eq("is_read", false);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (id) {
      await supabase
        .from("vehicle_access_logs")
        .update({ is_read: true })
        .eq("id", id);
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Missing notification id or markAll flag" }, { status: 400 });
  } catch (err) {
    console.error("Notifications PATCH exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
