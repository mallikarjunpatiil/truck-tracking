import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/constants";
import { z } from "zod";

const vehicleSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  agreement_number: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  chassis_number: z.string().optional().nullable(),
  engine_number: z.string().optional().nullable(),
  vehicle_make: z.string().optional().nullable(),
  vehicle_model: z.string().optional().nullable(),
  vehicle_year: z.number().int().optional().nullable(),
  vehicle_color: z.string().optional().nullable(),
  finance_company: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  status: z.string().default("active"),
  remarks: z.string().optional().nullable(),
});

// GET /api/vehicles — read-only access for all verified authenticated users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const { data, error } = await supabase
      .from("vehicles")
      .select("id, customer_name, agreement_number, registration_number, chassis_number, engine_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, finance_company, branch, status, remarks, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vehicles: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/vehicles — strictly ADMIN ONLY
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Strict server-side admin check: only mallikarjun.patil8638@gmail.com or active admin
    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const isAdmin = isSuperAdmin || (profile?.role === "admin" && profile?.is_active);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only authorized administrator can add vehicle records." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { data: newVehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        ...parsed.data,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Record audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "vehicle_created",
      resource_type: "vehicle",
      resource_id: newVehicle.id,
      details: { registration_number: newVehicle.registration_number, customer_name: newVehicle.customer_name },
    });

    return NextResponse.json({ success: true, vehicle: newVehicle }, { status: 201 });
  } catch (err) {
    console.error("Add vehicle error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
