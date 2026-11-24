import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const isSuperAdmin = Boolean(
    user.email && user.email.toLowerCase() === "mallikarjun.patil8638@gmail.com"
  );
  const profile = await getCurrentProfile(user.id);

  if (!isSuperAdmin && profile?.role !== "admin") {
    redirect("/access-denied");
  }

  return <>{children}</>;
}
