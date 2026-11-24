import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // Consolidated counts in parallel on server
    const [v, u, b, a] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "estimated", head: true }),
      supabase.from("profiles").select("id", { count: "estimated", head: true }),
      supabase.from("upload_batches").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    ]);

    const response = NextResponse.json({
      vehicles: v.count || 0,
      users: u.count || 0,
      batches: b.count || 0,
      admins: a.count || 0,
    });

    // Cache header: fast responses on repeated page visits
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (err) {
    console.error("Admin stats GET error:", err);
    return NextResponse.json(
      { vehicles: 0, users: 0, batches: 0, admins: 0 },
      { status: 500 }
    );
  }
}
