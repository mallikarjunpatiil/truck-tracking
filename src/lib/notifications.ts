/**
 * Enterprise Admin Notification Service
 * Dispatches WhatsApp / SMS alerts when users access vehicle details.
 */

export interface VehicleNotificationPayload {
  userName: string;
  userIdCode: string;
  userPhone?: string;
  userEmail: string;
  customerName: string;
  agreementNumber: string;
  registrationNumber: string;
  vehicleModel: string;
  accessTime: string;
  latitude?: number | null;
  longitude?: number | null;
  locationStatus: "granted" | "denied" | "unavailable" | "not_supported";
  googleMapsUrl?: string | null;
}

export function formatVehicleAccessMessage(payload: VehicleNotificationPayload): string {
  const locationText =
    payload.locationStatus === "granted" && payload.latitude && payload.longitude
      ? `${payload.latitude.toFixed(6)}, ${payload.longitude.toFixed(6)}`
      : "Not Available";

  const locationStatusLabel =
    payload.locationStatus === "granted"
      ? "Permission Granted"
      : payload.locationStatus === "denied"
      ? "Permission Denied"
      : "Unavailable";

  const mapLink =
    payload.googleMapsUrl ||
    (payload.latitude && payload.longitude
      ? `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}`
      : "N/A");

  return [
    "🚨 VEHICLE RECORD ACCESSED",
    "",
    `User Name: ${payload.userName || "N/A"}`,
    `User ID: ${payload.userIdCode || "N/A"}`,
    `Phone: ${payload.userPhone || "Not Provided"}`,
    `Email: ${payload.userEmail}`,
    "",
    `Vehicle Customer: ${payload.customerName || "N/A"}`,
    `Agreement Number: ${payload.agreementNumber || "N/A"}`,
    `Registration Number: ${payload.registrationNumber || "N/A"}`,
    `Vehicle Model: ${payload.vehicleModel || "N/A"}`,
    "",
    `Access Time: ${payload.accessTime}`,
    `Location: ${locationText}`,
    `Location Status: ${locationStatusLabel}`,
    "",
    `Map Location: ${mapLink}`,
  ].join("\n");
}

export interface DispatchResult {
  channel: "whatsapp" | "sms";
  provider: string;
  status: "delivered" | "failed" | "logged_credential_pending";
  recipient: string;
  messageBody: string;
  providerResponse?: Record<string, unknown>;
  error?: string;
}

export async function dispatchAdminNotification(
  payload: VehicleNotificationPayload
): Promise<DispatchResult> {
  const messageBody = formatVehicleAccessMessage(payload);
  const adminPhone =
    process.env.ADMIN_NOTIFICATION_PHONE ||
    process.env.ADMIN_PHONE_NUMBER ||
    "+919876543210"; // Default destination placeholder

  // 1. Check for Twilio WhatsApp Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioSid && twilioToken && twilioWhatsAppFrom) {
    try {
      const fromFormatted = twilioWhatsAppFrom.startsWith("whatsapp:")
        ? twilioWhatsAppFrom
        : `whatsapp:${twilioWhatsAppFrom}`;
      const toFormatted = adminPhone.startsWith("whatsapp:")
        ? adminPhone
        : `whatsapp:${adminPhone}`;

      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const params = new URLSearchParams();
      params.append("From", fromFormatted);
      params.append("To", toFormatted);
      params.append("Body", messageBody);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        return {
          channel: "whatsapp",
          provider: "twilio",
          status: "failed",
          recipient: toFormatted,
          messageBody,
          error: json.message || "Twilio delivery failed",
          providerResponse: json,
        };
      }

      return {
        channel: "whatsapp",
        provider: "twilio",
        status: "delivered",
        recipient: toFormatted,
        messageBody,
        providerResponse: json,
      };
    } catch (err) {
      return {
        channel: "whatsapp",
        provider: "twilio",
        status: "failed",
        recipient: adminPhone,
        messageBody,
        error: err instanceof Error ? err.message : "Network error during Twilio dispatch",
      };
    }
  }

  // 2. Check for Meta WhatsApp Cloud API Configuration
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (metaPhoneId && metaToken) {
    try {
      const recipientClean = adminPhone.replace(/[^0-9]/g, "");
      const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientClean,
          type: "text",
          text: { body: messageBody },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          channel: "whatsapp",
          provider: "meta",
          status: "failed",
          recipient: recipientClean,
          messageBody,
          error: json.error?.message || "Meta WhatsApp delivery failed",
          providerResponse: json,
        };
      }

      return {
        channel: "whatsapp",
        provider: "meta",
        status: "delivered",
        recipient: recipientClean,
        messageBody,
        providerResponse: json,
      };
    } catch (err) {
      return {
        channel: "whatsapp",
        provider: "meta",
        status: "failed",
        recipient: adminPhone,
        messageBody,
        error: err instanceof Error ? err.message : "Meta API connection failure",
      };
    }
  }

  // 3. Simulated / Log-Only Mode (Zero-Config Resilient Fallback)
  // When credentials are not yet configured in .env.local, we log the complete payload
  // so admins can inspect it in the Admin Access History panel without breaking user access.
  console.log("------------------------------------------");
  console.log("[ADMIN NOTIFICATION SIMULATION (Twilio/Meta credentials not set in .env.local)]");
  console.log(messageBody);
  console.log("------------------------------------------");

  return {
    channel: "whatsapp",
    provider: "system_logger",
    status: "logged_credential_pending",
    recipient: adminPhone,
    messageBody,
    providerResponse: {
      note: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, and ADMIN_NOTIFICATION_PHONE in .env.local for live WhatsApp delivery.",
    },
  };
}
