import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let profile = await getCurrentProfile(user.id);

  // Auto-grant ADMIN permissions to any logged-in user
  if (profile && profile.role !== "admin") {
    profile.role = "admin";
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
    } catch (e) {
      console.warn("[auto-grant admin failed]", e);
    }
  } else if (!profile) {
    profile = {
      id: user.id,
      email: user.email || "",
      full_name: (user.user_metadata?.full_name as string) || (user.email?.split("@")[0]) || "Admin",
      role: "admin",
      is_active: true,
      user_id_code: "ADMIN-" + user.id.slice(0, 4).toUpperCase(),
      phone_number: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (!profile) redirect("/login");

  return (
    <DashboardShell user={user} profile={profile}>
      {children}
    </DashboardShell>
  );
}
