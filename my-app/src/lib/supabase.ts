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
  
  const mappedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || 
          supabaseUser.user_metadata?.name || 
          supabaseUser.email?.split('@')[0] || 
          'User',
  };
  
  console.info('[mapSupabaseUser] Mapped user result:', mappedUser);
  return mappedUser;
};
