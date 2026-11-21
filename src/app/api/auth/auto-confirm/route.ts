import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const hasServiceRoleKey =
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key-here" &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder");

    if (!hasServiceRoleKey) {
      return NextResponse.json({ confirmed: false, note: "Service role key not configured" });
    }

    const serviceClient = await createServiceRoleClient();
    const { data: usersData, error: listError } = await serviceClient.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json({ confirmed: false, error: listError.message });
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (targetUser && !targetUser.email_confirmed_at) {
      const { error: updateError } = await serviceClient.auth.admin.updateUserById(
        targetUser.id,
        { email_confirm: true }
      );
      if (updateError) {
        return NextResponse.json({ confirmed: false, error: updateError.message });
      }
      return NextResponse.json({ confirmed: true, userId: targetUser.id });
    }

    return NextResponse.json({ confirmed: true, already: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auto-confirm failed";
    return NextResponse.json({ confirmed: false, error: message }, { status: 500 });
  }
}
