import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/batches/[id]/download — get signed download URL for original Excel file
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

    const { data: batch } = await supabase
      .from("upload_batches")
      .select("id, file_name, file_path")
      .eq("id", id)
      .single();

    if (!batch || !batch.file_path) {
      return NextResponse.json(
        { error: "No stored file found for this upload batch" },
        { status: 404 }
      );
    }

    // Generate signed URL (valid for 60 minutes)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("vehicle-uploads")
      .createSignedUrl(batch.file_path, 3600, {
        download: batch.file_name,
      });

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message || "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      downloadUrl: signedData.signedUrl,
      fileName: batch.file_name,
    });
  } catch (err) {
    console.error("Batch download exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
