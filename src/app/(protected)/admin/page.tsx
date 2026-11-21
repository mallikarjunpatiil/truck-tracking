import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardMain } from "@/components/admin/admin-dashboard-main";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const profile = await getCurrentProfile(user.id);
  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  if (!isSuperAdmin && profile?.role !== "admin") {
    redirect("/access-denied");
  }

  return <AdminDashboardMain />;
}
