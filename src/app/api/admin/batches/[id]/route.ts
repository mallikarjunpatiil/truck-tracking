import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/batches/[id] — get batch details and sample imported records
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    const { data: batch, error: batchErr } = await supabase
      .from("upload_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json({ error: "Upload batch not found" }, { status: 404 });
    }

    // Fetch sample records imported by this batch
    const { data: sampleVehicles } = await supabase
      .from("vehicles")
      .select("id, customer_name, agreement_number, registration_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, status")
      .eq("upload_batch_id", id)
      .limit(50);

    return NextResponse.json({
      batch,
      sampleVehicles: sampleVehicles || [],
    });
  } catch (err) {
    console.error("Batch GET [id] exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/batches/[id] — delete batch, imported vehicle records, and original file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // 1. Fetch batch to know file_path and filename
    const { data: batch } = await supabase
      .from("upload_batches")
      .select("id, file_name, file_path")
      .eq("id", id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: "Upload batch not found" }, { status: 404 });
    }

    // 2. Count records to be deleted
    const { count: deletedVehiclesCount } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("upload_batch_id", id);

    // 3. Delete all vehicles imported under this batch
    await supabase.from("vehicles").delete().eq("upload_batch_id", id);

    // 4. Remove original storage file if exists
    if (batch.file_path) {
      await supabase.storage.from("vehicle-uploads").remove([batch.file_path]);
    }

    // 5. Delete upload batch row
    await supabase.from("upload_batches").delete().eq("id", id);

    // 6. Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "batch_deleted",
      resource_type: "upload_batch",
      resource_id: id,
      details: {
        file_name: batch.file_name,
        deleted_vehicles_count: deletedVehiclesCount || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Batch and ${deletedVehiclesCount || 0} associated vehicle records deleted`,
    });
  } catch (err) {
    console.error("Batch DELETE exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
