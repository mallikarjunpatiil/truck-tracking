import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shield, Database, Lock, Server, CheckCircle2, AlertCircle } from "lucide-react";
import { ADMIN_EMAILS } from "@/lib/constants";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile(user.id);

  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!isSuperAdmin && profile?.role !== "admin") redirect("/access-denied");

  const envChecks = [
    { label: "Supabase URL", set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), required: true },
    { label: "Supabase Anon Key", set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), required: true },
    { label: "Service Role Key (Admin APIs)", set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-")), required: true },
    { label: "App URL", set: Boolean(process.env.NEXT_PUBLIC_APP_URL), required: false },
  ];

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">System Settings</h1>
        <p className="text-sm text-navy-500 mt-1">Environment configuration and security policies</p>
      </div>

      <div className="enterprise-card p-6">
        <h2 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          Environment &amp; Services
        </h2>
        <div className="divide-y divide-navy-100">
          {envChecks.map((item) => (
            <div key={item.label} className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-800">{item.label}</p>
                <p className="text-xs text-navy-400">{item.required ? "Required for core functionality" : "Optional"}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.set ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="enterprise-card p-6">
        <h2 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Database Security &amp; Policies
        </h2>
        <div className="space-y-3 text-sm text-navy-600">
          <div className="p-4 rounded-lg bg-navy-50 border border-navy-200">
            <p className="font-semibold text-navy-800 mb-1">Row Level Security (RLS)</p>
            <p className="text-xs text-navy-500 leading-relaxed">
              Row-Level Security is enabled on all tables (vehicles, profiles, upload_batches, audit_logs).
              Regular users can only search authorized vehicle records; audit records are isolated per user.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-navy-50 border border-navy-200">
            <p className="font-semibold text-navy-800 mb-1">Search &amp; Access Auditing</p>
            <p className="text-xs text-navy-500 leading-relaxed">
              All search queries and export attempts are logged with timestamps and user identifiers.
              Logs are queryable in the Audit Logs interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
