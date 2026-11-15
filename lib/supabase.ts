import { createClient } from "@supabase/supabase-js";
import { fetchWithAccessToken } from "@/lib/auth-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase public credentials missing in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return fetchWithAccessToken(
    input,
    init,
    data.session?.access_token,
    fetch,
    window.location.href,
  );
}
