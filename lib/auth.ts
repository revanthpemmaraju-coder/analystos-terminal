import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBearerToken } from '@/lib/auth-utils';
import { getSupabasePublicConfig } from './supabase-config';

export type AuthenticatedUser = {
  id: string;
  email?: string;
  plan: string;
  db: SupabaseClient;
};

export const getSupabaseClient = (token: string) => {
  if (!token) {
    throw new Error('Supabase user client requires an access token.');
  }
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
};

export async function getAuthenticatedUser(
  req: Pick<NextRequest, 'headers'>,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(req.headers.get('authorization'));
  if (!token) return null;

  const supabase = getSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  let plan = 'free';
  const { data: effectivePlan, error: planError } = await supabase.rpc(
    'get_effective_user_plan',
  );

  if (planError) {
    console.warn('Failed to fetch authenticated user plan:', planError.message);
  } else if (typeof effectivePlan === 'string') {
    plan = effectivePlan;
  }

  return {
    id: user.id,
    email: user.email,
    plan,
    db: supabase,
  };
}
