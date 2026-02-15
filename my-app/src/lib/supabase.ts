import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

/** Si es false, no hagas llamadas a Supabase Auth (getSession, setSession): devolverán 401. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. ' +
    'Add them to .env and restart. GET /auth/v1/user will return 401 until then.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { detectSessionInUrl: false },
});

// Helper function to map Supabase user to our User type
export const mapSupabaseUser = (supabaseUser: any): User | null => {
  if (!supabaseUser) return null;

  const metadata = supabaseUser.user_metadata || {};
  const identityData = supabaseUser.identities?.[0]?.identity_data;
  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    identityData?.avatar_url ||
    identityData?.picture ||
    undefined;

  const mappedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: metadata.full_name || metadata.name || identityData?.full_name || identityData?.name || supabaseUser.email?.split('@')[0] || 'User',
    avatarUrl: avatarUrl || undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    console.info('[mapSupabaseUser] Mapped (no PII in prod)', { hasAvatar: !!mappedUser.avatarUrl });
  }
  return mappedUser;
};
