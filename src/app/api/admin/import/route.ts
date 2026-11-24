import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

    // Admin verification: only mallikarjun.patil8638@gmail.com or active admin
    const isSuperAdmin = Boolean(
      user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!isSuperAdmin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    // ─────────────────────────────────────────────────────────────
    // A. JSON Body: Chunked Ingestion API (Handles 40,000+ records)
    // ─────────────────────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const action = body.action || "chunk";

      // 1. ACTION: INIT — Create initial batch
      if (action === "init") {
        const { fileName, totalRecords, mapping } = body;
        const { data: batch, error: batchError } = await supabase
          .from("upload_batches")
          .insert({
            file_name: fileName || "uploaded-file.xlsx",
            total_records: totalRecords || 0,
            imported_records: 0,
            duplicate_records: 0,
            failed_records: 0,
            status: "processing",
            uploaded_by: user.id,
            uploader_name: profile?.full_name || user.email || "Admin",
            column_mapping: mapping || {},
            errors: [],
          })
          .select("id")
          .single();

        if (batchError || !batch) {
          console.error("Batch init error:", batchError);
          return NextResponse.json(
            { error: batchError?.message || "Failed to initialize upload batch" },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, batchId: batch.id });
      }

      // 2. ACTION: CHUNK — Ingest a chunk of records
      if (action === "chunk") {
        const { batchId, records, duplicateStrategy } = body;
        if (!records || !Array.isArray(records) || records.length === 0) {
          return NextResponse.json({ success: true, imported: 0, duplicates: 0, failed: 0 });
        }

        // Clean & prepare records for insertion
        const recordsToInsert = records.map((r: Record<string, unknown>) => ({
          customer_name: r.customer_name,
          agreement_number: r.agreement_number || null,
          registration_number: r.registration_number || null,
          chassis_number: r.chassis_number || null,
          engine_number: r.engine_number || null,
          vehicle_type: r.vehicle_type || "Truck",
          vehicle_make: r.vehicle_make || null,
          vehicle_model: r.vehicle_model || null,
          vehicle_year: r.vehicle_year || null,
          vehicle_color: r.vehicle_color || null,
          finance_company: r.finance_company || null,
          branch: r.branch || null,
          status: r.status || "active",
          remarks: r.remarks || null,
          uploaded_by: user.id,
          upload_batch_id: batchId || null,
        }));

        let imported = 0;
        let duplicates = 0;
        let failed = 0;
        const errors: { row?: number; error: string; identifier?: string }[] = [];

        if (duplicateStrategy === "update") {
          // Upsert with overwrite on registration_number conflict
          const { data: upserted, error: upsertError } = await supabase
            .from("vehicles")
            .upsert(recordsToInsert, {
              onConflict: "registration_number",
              ignoreDuplicates: false,
            })
            .select("id");

          if (upsertError) {
            for (const item of recordsToInsert) {
              const { error: sErr } = await supabase
                .from("vehicles")
                .upsert(item, { onConflict: "registration_number" });
              if (!sErr) imported++;
              else {
                failed++;
                if (errors.length < 10)
                  errors.push({ error: sErr.message, identifier: item.registration_number as string });
              }
            }
          } else {
            imported = upserted?.length || recordsToInsert.length;
          }
        } else {
          // Default: Skip duplicates on registration_number
          const { data: inserted, error: insertError } = await supabase
            .from("vehicles")
            .upsert(recordsToInsert, {
              onConflict: "registration_number",
              ignoreDuplicates: true,
            })
            .select("id");

          if (insertError) {
            for (const item of recordsToInsert) {
              const { error: sErr } = await supabase.from("vehicles").insert(item);
              if (!sErr) {
                imported++;
              } else if (
                sErr.code === "23505" ||
                sErr.message.toLowerCase().includes("unique") ||
                sErr.message.toLowerCase().includes("duplicate")
              ) {
                duplicates++;
              } else {
                failed++;
                if (errors.length < 10)
                  errors.push({ error: sErr.message, identifier: item.registration_number as string });
              }
            }
          } else {
            imported = inserted?.length || recordsToInsert.length;
          }
        }

        return NextResponse.json({
          success: true,
          imported,
          duplicates,
          failed,
          errors,
        });
      }

      // 3. ACTION: FINALIZE — Mark batch completed
      if (action === "finalize") {
        const { batchId, imported, duplicates, failed, errors, fileName } = body;
        if (batchId) {
          const finalStatus = failed > 0 && imported === 0 ? "failed" : "completed";
          await supabase
            .from("upload_batches")
            .update({
              imported_records: imported || 0,
              duplicate_records: duplicates || 0,
              failed_records: failed || 0,
              status: finalStatus,
              errors: errors || [],
              completed_at: new Date().toISOString(),
            })
            .eq("id", batchId);

          // Audit log
          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action: "excel_import",
            resource_type: "upload_batch",
            resource_id: batchId,
            details: {
              file_name: fileName || "uploaded-file.xlsx",
              imported,
              duplicates,
              failed,
            },
          });
        }

        return NextResponse.json({ success: true, batchId });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // B. Multipart/form-data Ingestion (Fallback for smaller files)
    // ─────────────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingStr = formData.get("mapping") as string | null;
    const strategyStr = formData.get("duplicateStrategy") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let mapping: Record<string, string> = {};
    if (mappingStr) {
      try {
        mapping = JSON.parse(mappingStr);
      } catch {
        mapping = {};
      }
    }
    const duplicateStrategy = strategyStr || "skip";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel buffer
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "The uploaded file contains no data rows" }, { status: 400 });
    }

    if (!mapping.customer_name) {
      return NextResponse.json({ error: "Customer name column mapping is required" }, { status: 400 });
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        file_name: file.name,
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
      return NextResponse.json({ error: "Failed to create upload batch record" }, { status: 500 });
    }

    const batchId = batch.id;
    let imported = 0;
    let duplicates = 0;
    let failed = 0;

    const getVal = (row: Record<string, unknown>, key: string): string => {
      const col = mapping[key];
      if (!col || row[col] === undefined || row[col] === null) return "";
      return String(row[col]).trim();
    };

    const validRecords: Record<string, unknown>[] = [];
    for (const row of rows) {
      const customerName = getVal(row, "customer_name");
      if (!customerName) {
        failed++;
        continue;
      }

      validRecords.push({
        customer_name: customerName,
        agreement_number: getVal(row, "agreement_number") || null,
        registration_number: getVal(row, "registration_number") || null,
        chassis_number: getVal(row, "chassis_number") || null,
        engine_number: getVal(row, "engine_number") || null,
        vehicle_type: getVal(row, "vehicle_type") || "Truck",
        vehicle_make: getVal(row, "vehicle_make") || null,
        vehicle_model: getVal(row, "vehicle_model") || null,
        vehicle_color: getVal(row, "vehicle_color") || null,
        finance_company: getVal(row, "finance_company") || null,
        branch: getVal(row, "branch") || null,
        status: getVal(row, "status") || "active",
        remarks: getVal(row, "remarks") || null,
        uploaded_by: user.id,
        upload_batch_id: batchId,
      });
    }

    const chunkSize = 200;
    for (let i = 0; i < validRecords.length; i += chunkSize) {
      const chunk = validRecords.slice(i, i + chunkSize);
      const { data: ins, error: insErr } = await supabase
        .from("vehicles")
        .upsert(chunk, {
          onConflict: "registration_number",
          ignoreDuplicates: duplicateStrategy === "skip",
        })
        .select("id");

      if (insErr) {
        failed += chunk.length;
      } else {
        imported += ins?.length || chunk.length;
      }
    }

    await supabase
      .from("upload_batches")
      .update({
        imported_records: imported,
        duplicate_records: duplicates,
        failed_records: failed,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return NextResponse.json({
      success: true,
      batchId,
      total: rows.length,
      imported,
      duplicates,
      failed,
      status: "completed",
    });
  } catch (err: unknown) {
    console.error("Import API fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error during import" },
      { status: 500 }
    );
  }
}
