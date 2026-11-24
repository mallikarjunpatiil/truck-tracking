import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/constants";

async function verifyAdmin(userEmail?: string, userId?: string) {
  if (!userId) return false;
  if (userEmail && userEmail.toLowerCase() === "mallikarjun.patil8638@gmail.com") return true;
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single();
  return Boolean(profile?.role === "admin" && profile?.is_active);
}

// GET /api/vehicles/[id] — read single vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/vehicles/[id] — strictly ADMIN ONLY
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await verifyAdmin(user.email, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only authorized administrators can edit vehicle records." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customer_name, agreement_number, registration_number, chassis_number,
      engine_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color,
      finance_company, branch, status, remarks
    } = body;

    const updates: Record<string, unknown> = {};
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (agreement_number !== undefined) updates.agreement_number = agreement_number;
    if (registration_number !== undefined) updates.registration_number = registration_number;
    if (chassis_number !== undefined) updates.chassis_number = chassis_number;
    if (engine_number !== undefined) updates.engine_number = engine_number;
    if (vehicle_make !== undefined) updates.vehicle_make = vehicle_make;
    if (vehicle_model !== undefined) updates.vehicle_model = vehicle_model;
    if (vehicle_year !== undefined) updates.vehicle_year = vehicle_year;
    if (vehicle_color !== undefined) updates.vehicle_color = vehicle_color;
    if (finance_company !== undefined) updates.finance_company = finance_company;
    if (branch !== undefined) updates.branch = branch;
    if (status !== undefined) updates.status = status;
    if (remarks !== undefined) updates.remarks = remarks;

    const { data: updated, error } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "vehicle_updated",
      resource_type: "vehicle",
      resource_id: id,
      details: updates,
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/vehicles/[id] — strictly ADMIN ONLY
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await verifyAdmin(user.email, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only authorized administrators can delete vehicle records." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "vehicle_deleted",
      resource_type: "vehicle",
      resource_id: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
