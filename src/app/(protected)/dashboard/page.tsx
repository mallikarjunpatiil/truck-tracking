import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { VehicleSearch } from "@/components/dashboard/vehicle-search";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile(user.id);

  const isAdmin =
    profile?.role === "admin" ||
    Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">
          Welcome back, {profile?.full_name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-sm text-navy-500 mt-1">Search and manage vehicle records</p>
      </div>
      <DashboardStats userId={user.id} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <VehicleSearch userId={user.id} isAdmin={isAdmin} />
        </div>
        <div>
          <RecentActivity userId={user.id} />
        </div>
      </div>
    </div>
  );
}
