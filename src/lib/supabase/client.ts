import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbawyuzqhxfqoyjhwpnc.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qy_8m0bDYR9Kg9Gl_ZA99Q_AStcBwUO";

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return browserClient;
}
