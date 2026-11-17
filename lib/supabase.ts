import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithAccessToken } from "./auth-utils";
import { getSupabasePublicConfig } from "./supabase-config";

let client: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;

  return fetchWithAccessToken(
    input,
    init,
    data.session?.access_token,
    fetch,
    window.location.href,
  );
}
