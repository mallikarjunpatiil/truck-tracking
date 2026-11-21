import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExcelUploader } from "@/components/admin/excel-uploader";
import { UploadedFilesHistory } from "@/components/admin/uploaded-files-history";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const profile = await getCurrentProfile(user.id);

  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!isSuperAdmin && profile?.role !== "admin") redirect("/access-denied");

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Upload Vehicle Data</h1>
        <p className="text-sm text-navy-500 mt-1">Import vehicle and agreement records from Excel</p>
      </div>
      <ExcelUploader />
      <UploadedFilesHistory />
    </div>
  );
}
