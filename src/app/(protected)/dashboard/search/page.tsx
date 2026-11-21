import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { VehicleSearch } from "@/components/dashboard/vehicle-search";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function SearchPage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile(user.id) : null;

  const isAdmin =
    profile?.role === "admin" ||
    Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Vehicle Search</h1>
        <p className="text-sm text-navy-500 mt-1">Find vehicle records using multiple search criteria</p>
      </div>
      <VehicleSearch userId={user?.id} isAdmin={isAdmin} />
    </div>
  );
}
