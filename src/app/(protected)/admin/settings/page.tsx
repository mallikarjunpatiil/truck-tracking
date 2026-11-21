import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Shield,
  Database,
  Server,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Zap,
} from "lucide-react";
import { ADMIN_EMAILS } from "@/lib/constants";
import { SettingsClientView } from "./settings-client-view";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbawyuzqhxfqoyjhwpnc.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qy_8m0bDYR9Kg9Gl_ZA99Q_AStcBwUO";
const HAS_SERVICE_ROLE = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-") &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://truck-tracking-zmfb.vercel.app";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const profile = await getCurrentProfile(user.id);
  const isSuperAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!isSuperAdmin && profile?.role !== "admin") redirect("/access-denied");

  const envItems = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase Project URL",
      fromEnv: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      activeValue: SUPABASE_URL,
      status: "Active (Connected)",
      description: "Direct REST endpoint for database and authentication",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "Supabase Public Anon Key",
      fromEnv: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      activeValue: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : "",
      fullValue: SUPABASE_ANON_KEY,
      status: "Active (Validated)",
      description: "Public client authorization key with RLS protection",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "Service Role Key (Admin APIs)",
      fromEnv: HAS_SERVICE_ROLE,
      activeValue: HAS_SERVICE_ROLE ? "Configured on Server" : "Using Direct Supabase Auth",
      fullValue: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      status: HAS_SERVICE_ROLE ? "Configured" : "Optional for Standard Ops",
      description: "Server-only key for administrative user management",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "Production App URL",
      fromEnv: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      activeValue: APP_URL,
      status: "Active",
      description: "Public canonical domain for email verification redirects",
    },
  ];

  return <SettingsClientView envItems={envItems} supabaseUrl={SUPABASE_URL} supabaseAnonKey={SUPABASE_ANON_KEY} appUrl={APP_URL} />;
}
