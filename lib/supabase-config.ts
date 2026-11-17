export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase public credentials are missing in environment variables.");
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabasePublicConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigurationError();
  }
  return { supabaseUrl, supabaseAnonKey };
}
