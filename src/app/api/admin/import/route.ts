import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // All authenticated users have admin access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let fileName = "uploaded-file.xlsx";
    let filePath: string | null = null;
    let mapping: Record<string, string> = {};
    let rows: Record<string, unknown>[] = [];
    let duplicateStrategy = "skip"; // "skip" or "update"

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const mappingStr = formData.get("mapping") as string | null;
      const strategyStr = formData.get("duplicateStrategy") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      fileName = file.name;
      if (mappingStr) {
        try {
          mapping = JSON.parse(mappingStr);
        } catch {
          mapping = {};
        }
      }
      if (strategyStr) {
        duplicateStrategy = strategyStr;
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // 1. Store original file in private Supabase Storage bucket 'vehicle-uploads'
      const batchId = crypto.randomUUID();
      const storagePath = `excel/${batchId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("vehicle-uploads")
          .upload(storagePath, buffer, {
            contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          });

        if (!uploadError) {
          filePath = storagePath;
        } else {
          console.warn("[Storage upload warning]", uploadError);
        }
      } catch (storageErr) {
        console.warn("[Storage exception]", storageErr);
      }

      // 2. Parse Excel buffer
      const wb = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    } else {
      // JSON payload fallback
      const body = await request.json();
      rows = body.rows || [];
      mapping = body.mapping || {};
      fileName = body.fileName || "uploaded-data.xlsx";
      duplicateStrategy = body.duplicateStrategy || "skip";
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "The uploaded file contains no data rows" }, { status: 400 });
    }

    if (!mapping.customer_name) {
      return NextResponse.json({ error: "Customer name column mapping is required" }, { status: 400 });
    }

    // 3. Create initial upload batch record
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        file_name: fileName,
        file_path: filePath,
        total_records: rows.length,
        imported_records: 0,
        duplicate_records: 0,
        failed_records: 0,
        status: "processing",
        uploaded_by: user.id,
        uploader_name: profile?.full_name || user.email || "Admin",
        column_mapping: mapping,
        errors: [],
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      console.error("Batch creation failed:", batchError);
      return NextResponse.json({ error: "Failed to create upload batch record" }, { status: 500 });
    }

    const batchId = batch.id;
    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    const errorsList: { row: number; error: string; identifier?: string }[] = [];

    // Helper to get mapped cell value
    const getVal = (row: Record<string, unknown>, key: string): string => {
      const col = mapping[key];
      if (!col || row[col] === undefined || row[col] === null) return "";
      return String(row[col]).trim();
    };

    // 4. Pre-fetch existing identifiers to detect duplicates efficiently
    const { data: existingVehicles } = await supabase
      .from("vehicles")
      .select("id, registration_number, agreement_number, chassis_number");

    const existingRegSet = new Set<string>();
    const existingAgrSet = new Set<string>();
    const existingChsSet = new Set<string>();

    existingVehicles?.forEach((v) => {
      if (v.registration_number) existingRegSet.add(v.registration_number.toLowerCase().trim());
      if (v.agreement_number) existingAgrSet.add(v.agreement_number.toLowerCase().trim());
      if (v.chassis_number) existingChsSet.add(v.chassis_number.toLowerCase().trim());
    });

    const validRecordsToInsert: Record<string, unknown>[] = [];
    const recordsToUpdate: Record<string, unknown>[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const customerName = getVal(row, "customer_name");

      if (!customerName) {
        failed++;
        errorsList.push({ row: index + 2, error: "Missing required Customer Name" });
        continue;
      }

      const regNum = getVal(row, "registration_number") || null;
      const agrNum = getVal(row, "agreement_number") || null;
      const chsNum = getVal(row, "chassis_number") || null;
      const engNum = getVal(row, "engine_number") || null;
      const make = getVal(row, "vehicle_make") || null;
      const model = getVal(row, "vehicle_model") || null;
      const color = getVal(row, "vehicle_color") || null;
      const vehicleType = getVal(row, "vehicle_type") || "Truck";
      const financeCompany = getVal(row, "finance_company") || null;
      const branch = getVal(row, "branch") || null;
      const status = getVal(row, "status") || "active";
      const remarks = getVal(row, "remarks") || null;

      let year: number | null = null;
      const yearStr = getVal(row, "vehicle_year");
      if (yearStr) {
        const parsedYear = parseInt(yearStr, 10);
        if (!isNaN(parsedYear) && parsedYear >= 1970 && parsedYear <= 2035) {
          year = parsedYear;
        }
      }

      // Check duplicates
      const isDuplicate =
        (regNum && existingRegSet.has(regNum.toLowerCase())) ||
        (agrNum && existingAgrSet.has(agrNum.toLowerCase())) ||
        (chsNum && existingChsSet.has(chsNum.toLowerCase()));

      const recordPayload = {
        customer_name: customerName,
        agreement_number: agrNum,
        registration_number: regNum,
        chassis_number: chsNum,
        engine_number: engNum,
        vehicle_type: vehicleType,
        vehicle_make: make,
        vehicle_model: model,
        vehicle_year: year,
        vehicle_color: color,
        finance_company: financeCompany,
        branch: branch,
        status: status,
        remarks: remarks,
        uploaded_by: user.id,
        upload_batch_id: batchId,
      };

      if (isDuplicate) {
        duplicates++;
        if (duplicateStrategy === "update" && regNum) {
          recordsToUpdate.push(recordPayload);
        } else {
          errorsList.push({
            row: index + 2,
            error: "Duplicate vehicle identifier detected",
            identifier: regNum || agrNum || chsNum || customerName,
          });
        }
      } else {
        // Track in local set to avoid intra-batch duplicates
        if (regNum) existingRegSet.add(regNum.toLowerCase());
        if (agrNum) existingAgrSet.add(agrNum.toLowerCase());
        if (chsNum) existingChsSet.add(chsNum.toLowerCase());
        validRecordsToInsert.push(recordPayload);
      }
    }

    // 5. Batch insert valid records in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < validRecordsToInsert.length; i += chunkSize) {
      const chunk = validRecordsToInsert.slice(i, i + chunkSize);
      const { data: inserted, error: insertError } = await supabase
        .from("vehicles")
        .insert(chunk)
        .select("id");

      if (insertError) {
        console.error("Chunk insert error:", insertError);
        failed += chunk.length;
        errorsList.push({ row: i + 2, error: insertError.message });
      } else {
        imported += inserted?.length || chunk.length;
      }
    }

    // 6. Handle duplicate updates if policy is "update"
    if (duplicateStrategy === "update" && recordsToUpdate.length > 0) {
      for (const rec of recordsToUpdate) {
        const { error: updErr } = await supabase
          .from("vehicles")
          .update(rec)
          .eq("registration_number", rec.registration_number);

        if (!updErr) {
          imported++;
          duplicates--;
        }
      }
    }

    // 7. Finalize batch status
    const finalStatus =
      failed === rows.length
        ? "failed"
        : imported > 0
        ? "completed"
        : duplicates === rows.length
        ? "completed"
        : "failed";

    await supabase
      .from("upload_batches")
      .update({
        imported_records: imported,
        duplicate_records: duplicates,
        failed_records: failed,
        status: finalStatus,
        errors: errorsList.slice(0, 100), // Cap at 100 errors
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // 8. Log administrative audit action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "excel_import",
      resource_type: "upload_batch",
      resource_id: batchId,
      details: {
        file_name: fileName,
        file_path: filePath,
        total: rows.length,
        imported,
        duplicates,
        failed,
      },
    });

    return NextResponse.json({
      success: true,
      batchId,
      fileName,
      total: rows.length,
      imported,
      duplicates,
      failed,
      status: finalStatus,
      errors: errorsList.slice(0, 50),
    });
  } catch (error) {
    console.error("Excel import route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error during Excel processing" },
      { status: 500 }
    );
  }
}
