import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dispatchAdminNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, location } = body;

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, user_id_code, phone_number, email")
      .eq("id", user.id)
      .single();

    // 2. Fetch vehicle details
    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("id, customer_name, agreement_number, registration_number, vehicle_model, vehicle_make")
      .eq("id", vehicleId)
      .single();

    if (vehicleErr || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const lat = typeof location?.latitude === "number" ? location.latitude : null;
    const lng = typeof location?.longitude === "number" ? location.longitude : null;
    const accuracy = typeof location?.accuracy === "number" ? location.accuracy : null;
    const locationStatus = ["granted", "denied", "unavailable", "not_supported"].includes(location?.status)
      ? location.status
      : "denied";

    const googleMapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    const accessTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium",
    });

    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;

    const userIdCode = profile?.user_id_code || `USR-${user.id.slice(0, 6).toUpperCase()}`;

    // 3. Save access log to database
    let logId: string | null = null;
    const { data: accessLog, error: logErr } = await supabase
      .from("vehicle_access_logs")
      .insert({
        user_id: user.id,
        user_name: profile?.full_name || "User",
        user_id_code: userIdCode,
        user_phone: profile?.phone_number || null,
        user_email: user.email,
        vehicle_id: vehicle.id,
        customer_name: vehicle.customer_name,
        agreement_number: vehicle.agreement_number,
        registration_number: vehicle.registration_number,
        vehicle_model: [vehicle.vehicle_make, vehicle.vehicle_model].filter(Boolean).join(" "),
        accessed_at: new Date().toISOString(),
        latitude: lat,
        longitude: lng,
        location_accuracy: accuracy,
        location_status: locationStatus,
        google_maps_url: googleMapsUrl,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_read: false,
      })
      .select("id")
      .single();

    if (!logErr && accessLog) {
      logId = accessLog.id;
    }

    // 4. Dispatch Admin Notification via WhatsApp / SMS / Logger
    const dispatchResult = await dispatchAdminNotification({
      userName: profile?.full_name || "User",
      userIdCode,
      userPhone: profile?.phone_number || undefined,
      userEmail: user.email || "",
      customerName: vehicle.customer_name,
      agreementNumber: vehicle.agreement_number || "N/A",
      registrationNumber: vehicle.registration_number || "N/A",
      vehicleModel: [vehicle.vehicle_make, vehicle.vehicle_model].filter(Boolean).join(" ") || "N/A",
      accessTime,
      latitude: lat,
      longitude: lng,
      locationStatus,
      googleMapsUrl,
    });

    // 5. Save notification result in admin_notification_logs
    if (logId) {
      await supabase.from("admin_notification_logs").insert({
        access_log_id: logId,
        channel: dispatchResult.channel,
        recipient: dispatchResult.recipient,
        message_body: dispatchResult.messageBody,
        provider: dispatchResult.provider,
        status: dispatchResult.status,
        provider_response: dispatchResult.providerResponse,
        error_message: dispatchResult.error || null,
      });

      // Update vehicle_access_logs with delivery status
      await supabase
        .from("vehicle_access_logs")
        .update({
          notification_sent: dispatchResult.status === "delivered",
          notification_channel: dispatchResult.channel,
          notification_error: dispatchResult.error || null,
        })
        .eq("id", logId);
    }

    return NextResponse.json({
      success: true,
      logId,
      notification: {
        channel: dispatchResult.channel,
        status: dispatchResult.status,
      },
    });
  } catch (error) {
    console.error("Vehicle view notification error:", error);
    // Return success: false without failing user's vehicle view
    return NextResponse.json(
      { success: false, error: "Notification processing encountered an error" },
      { status: 500 }
    );
  }
}
