import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const profile = await getCurrentProfile(user.id);
  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  if (!isSuperAdmin && profile?.role !== "admin") {
    redirect("/access-denied");
  }

  return <>{children}</>;
}
