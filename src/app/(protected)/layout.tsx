import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Mandatory server-side check for verified email
  const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!isEmailVerified) {
    redirect(`/login?error=unverified&email=${encodeURIComponent(user.email || "")}`);
  }

  let profile = await getCurrentProfile(user.id);

  // If user is designated admin, ensure admin role is honored
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    if (profile && profile.role !== "admin") {
      profile.role = "admin";
      const supabase = await createServerSupabaseClient();
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
    } else if (!profile) {
      profile = {
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata?.full_name as string) || "Admin",
        role: "admin",
        is_active: true,
        user_id_code: "ADMIN-001",
        phone_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  if (!profile) redirect("/login");

  return (
    <DashboardShell user={user} profile={profile}>
      {children}
    </DashboardShell>
  );
}
