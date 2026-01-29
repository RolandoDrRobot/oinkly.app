import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

console.info('[Supabase] Initializing client...', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlPrefix: supabaseUrl.substring(0, 20) + '...',
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.info('[Supabase] Client created successfully');

// Helper function to map Supabase user to our User type
export const mapSupabaseUser = (supabaseUser: any): User | null => {
  console.info('[mapSupabaseUser] Mapping user:', {
    hasUser: !!supabaseUser,
    userId: supabaseUser?.id,
    email: supabaseUser?.email,
    metadata: supabaseUser?.user_metadata,
  });
  
  if (!supabaseUser) {
    console.info('[mapSupabaseUser] No user provided, returning null');
    return null;
  }
  
  const metadata = supabaseUser.user_metadata || {};
  // Avatar: Google sends "picture"; Supabase may store as avatar_url or in identities[].identity_data
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
  
  if (process.env.NODE_ENV === 'development' && !avatarUrl) {
    console.info('[mapSupabaseUser] No avatar URL found. user_metadata keys:', Object.keys(metadata), 'identity_data keys:', identityData ? Object.keys(identityData) : []);
  }
  console.info('[mapSupabaseUser] Mapped user result:', { ...mappedUser, avatarUrl: mappedUser.avatarUrl ? '(set)' : '(empty)' });
  return mappedUser;
};
