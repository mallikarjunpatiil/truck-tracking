import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/user-management";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile(user.id);

  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!isSuperAdmin && profile?.role !== "admin") redirect("/access-denied");

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">User Management</h1>
        <p className="text-sm text-navy-500 mt-1">Manage user accounts, roles and access</p>
      </div>
      <UserManagement />
    </div>
  );
}
