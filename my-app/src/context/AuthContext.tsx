import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';
import { supabase, mapSupabaseUser } from '../lib/supabase';
import { hydrateFromSupabase } from '../lib/supabaseData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, name: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.info('[AuthContext] useEffect - Checking for existing session...');
    console.info('[AuthContext] Current URL:', {
      href: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      pathname: window.location.pathname,
    });
    
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.info('[AuthContext] getSession result:', {
        hasSession: !!session,
        hasError: !!error,
        error: error?.message,
        errorCode: error?.status,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        accessToken: session?.access_token ? 'present' : 'missing',
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_in,
      });
      
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        console.error('[AuthContext] Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      }
      
      if (session) {
        console.info('[AuthContext] Session found, mapping user...');
        const mappedUser = mapSupabaseUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setIsAuthenticated(true);
          storage.setUser(mappedUser);
          try {
            const data = await hydrateFromSupabase(mappedUser.id);
            storage.hydrateToLocalStorage(data, mappedUser.id);
            console.info('[AuthContext] Data hydrated from Supabase');
          } catch (err) {
            console.warn('[AuthContext] Hydrate from Supabase failed', err);
          }
        } else {
          console.warn('[AuthContext] Failed to map user from session');
        }
      } else {
        console.info('[AuthContext] No session found');
      }
      setLoading(false);
    });

    // Listen for auth changes
    console.info('[AuthContext] Setting up auth state change listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info('[AuthContext] onAuthStateChange triggered:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });
      
      if (session) {
        const mappedUser = mapSupabaseUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setIsAuthenticated(true);
          storage.setUser(mappedUser);
          hydrateFromSupabase(mappedUser.id)
            .then((data) => {
              storage.hydrateToLocalStorage(data, mappedUser.id);
              console.info('[AuthContext] Data hydrated from Supabase (onAuthChange)');
            })
            .catch((err) => console.warn('[AuthContext] Hydrate failed', err));
        } else {
          console.warn('[AuthContext] Failed to map user in onAuthStateChange');
        }
      } else {
        console.info('[AuthContext] No session in onAuthStateChange, clearing state');
        setUser(null);
        setIsAuthenticated(false);
        storage.logout();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (email: string, name: string) => {
    // Fallback login for backward compatibility
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
    };
    storage.setUser(newUser);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const loginWithGoogle = async () => {
    try {
      console.info('[AuthContext] loginWithGoogle called');
      setLoading(true);
      const redirectTo = `${window.location.origin}/dashboard`;
      console.info('[AuthContext] Initiating OAuth with redirectTo:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      });

      console.info('[AuthContext] signInWithOAuth response:', {
        hasData: !!data,
        hasError: !!error,
        error: error?.message,
        url: data?.url,
      });

      if (error) {
        console.error('[AuthContext] Error signing in with Google:', error);
        setLoading(false);
        throw error;
      }
      
      console.info('[AuthContext] OAuth initiated successfully, redirect should happen');
      // Note: setLoading(false) is not called here because the redirect will happen
      // and the component will unmount. The loading state will be reset when the
      // user returns and onAuthStateChange fires.
    } catch (error) {
      console.error('[AuthContext] Exception during Google login:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.info('[AuthContext] logout called');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      console.info('[AuthContext] signOut result:', {
        hasError: !!error,
        error: error?.message,
      });
      
      if (error) {
        console.error('[AuthContext] Error signing out:', error);
        throw error;
      }
      console.info('[AuthContext] Sign out successful, clearing state');
      setUser(null);
      setIsAuthenticated(false);
      storage.logout();
    } catch (error) {
      console.error('[AuthContext] Exception during logout:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
