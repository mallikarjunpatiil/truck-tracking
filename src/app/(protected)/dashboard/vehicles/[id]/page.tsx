import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Shield } from "lucide-react";
import { VehicleDetailView } from "@/components/dashboard/vehicle-detail-view";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/constants";
import type { Vehicle } from "@/types/database";

export default async function VehicleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile(user.id);

  const supabase = await createServerSupabaseClient();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !vehicle) {
    notFound();
  }

  const isAdmin =
    profile?.role === "admin" ||
    Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3.5 h-3.5" /> Administrator Mode
          </span>
        )}
      </div>

      <VehicleDetailView
        vehicle={vehicle as unknown as Vehicle}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </div>
  );
}
