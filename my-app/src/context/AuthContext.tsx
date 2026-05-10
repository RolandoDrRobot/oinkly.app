import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';
import { analytics } from '../utils/analytics';
import { supabase, mapSupabaseUser, isSupabaseConfigured } from '../lib/supabase';
import {
  hydrateFromSupabase,
  setSubscription,
  setUserPreferences,
  type HydratePayload,
} from '../lib/supabaseData';

// Bypass Supabase auth and use localStorage only. Set to false to re-enable cloud auth.
const LOCAL_MODE = true;

const DEFAULT_PREFS = {
  localCurrency: 'USD',
  language: 'en',
  themeMode: null as string | null,
  colorScheme: null as string | null,
  hideAmounts: false,
  hasSeenInitialSetup: false,
};

/** Asegura que un usuario nuevo tenga fila en subscription y user_preferences en Supabase y datos listos para localStorage. */
async function ensureUserDefaultsInSupabase(userId: string, data: HydratePayload): Promise<void> {
  try {
    if (!data.subscription) {
      await setSubscription(userId, { plan: 'free' });
      data.subscription = { plan: 'free' };
    }
    if (!data.preferences) {
      await setUserPreferences(userId, DEFAULT_PREFS);
      data.preferences = DEFAULT_PREFS;
    }
  } catch (e) {
    console.warn('[AuthContext] ensureUserDefaultsInSupabase failed', e);
  }
}

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
    if (LOCAL_MODE) {
      const existing = storage.getUser();
      const localUser: User = existing || { id: 'local-user', email: 'user@local.app', name: 'Usuario' };
      storage.setUser(localUser);
      setUser(localUser);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const hash = window.location.hash;
      const hasOAuthHash = hash && /access_token=/.test(hash);

      // Vuelta de OAuth: Supabase redirige a Site URL (ej. oinkly.app) con #access_token=...
      // Establecemos sesión desde el hash y mandamos al usuario a /dashboard.
      if (hasOAuthHash) {
        try {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!cancelled && !error && session) {
              const mappedUser = mapSupabaseUser(session.user);
              if (mappedUser) {
                setUser(mappedUser);
                setIsAuthenticated(true);
                storage.setUser(mappedUser);
                analytics.signInSuccess('google');
                try {
                  const data = await hydrateFromSupabase(mappedUser.id);
                  await ensureUserDefaultsInSupabase(mappedUser.id, data);
                  storage.hydrateToLocalStorage(data, mappedUser.id);
                } catch (err) {
                  console.warn('[AuthContext] Hydrate from Supabase failed', err);
                }
              }
              window.location.replace(window.location.origin + '/dashboard');
              return;
            }
            // 401 u otro error: quitar hash para no reintentar en bucle y que el usuario pueda volver a iniciar sesión
            if (error) {
              console.warn('[AuthContext] setSession failed (e.g. 401). Check REACT_APP_SUPABASE_ANON_KEY and device clock.', error);
              window.history.replaceState(null, '', window.location.pathname || '/');
            }
          }
        } catch (e) {
          console.warn('[AuthContext] Failed to set session from OAuth hash', e);
          window.history.replaceState(null, '', window.location.pathname || '/');
        }
      }

      // Sesión ya existente (recarga o visita directa)
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.error('[AuthContext] Error getting session:', error);
      }
      if (session) {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search || '/');
        }
        const mappedUser = mapSupabaseUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setIsAuthenticated(true);
          storage.setUser(mappedUser);
          analytics.signInSuccess('session_restore');
          try {
            const data = await hydrateFromSupabase(mappedUser.id);
            await ensureUserDefaultsInSupabase(mappedUser.id, data);
            storage.hydrateToLocalStorage(data, mappedUser.id);
          } catch (err) {
            console.warn('[AuthContext] Hydrate from Supabase failed', err);
          }
        }
      }
      setLoading(false);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // initAuth() already restores session via getSession() — avoid duplicate hydrate/setUser and second Dashboard render
      if (event === 'INITIAL_SESSION') return;

      if (session) {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search || '/');
        }
        const mappedUser = mapSupabaseUser(session.user);
        if (mappedUser) {
          hydrateFromSupabase(mappedUser.id)
            .then(async (data) => {
              await ensureUserDefaultsInSupabase(mappedUser.id, data);
              storage.hydrateToLocalStorage(data, mappedUser.id);
              setUser(mappedUser);
              setIsAuthenticated(true);
              storage.setUser(mappedUser);
              analytics.signInSuccess('google');
            })
            .catch((err) => console.warn('[AuthContext] Hydrate failed', err))
            .finally(() => setLoading(false));
          return;
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        storage.logout();
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = (email: string, name: string) => {
    // Dev-only: when Supabase is not configured. Disabled in production to avoid auth bypass.
    if (isSupabaseConfigured) return;
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
      setLoading(true);
      const redirectTo = `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      });

      if (error) {
        console.error('[AuthContext] Error signing in with Google:', error);
        setLoading(false);
        throw error;
      }
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
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[AuthContext] Error signing out:', error);
        throw error;
      }
      if (process.env.NODE_ENV === 'development') {
        console.info('[AuthContext] Sign out successful');
      }
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
