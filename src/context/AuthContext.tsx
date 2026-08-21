import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insforge, isInsforgeConfigured } from '@/lib/insforge';
import type { AppRole, ApprovalStatus } from '@/types/domain';

export type { AppRole } from '@/types/domain';

const REFRESH_TOKEN_KEY = 'tsc.insforge.refreshToken';
const LWSD_RE = /@lwsd\.org$/i;

/** Minimal session shape, enough for the rest of the app to check "signed in". */
export interface AppSession {
  user: { id: string; email: string };
}

/**
 * The signed-in user's profile row. `role` and `president_status` are read
 * straight from `public.profiles` and are only ever set by the database
 * (RLS + the SECURITY DEFINER RPCs in the schema migration). The client
 * treats them as display hints: every privileged action is re-checked
 * server-side.
 */
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  /** President-verification lifecycle. `null` = never requested. */
  president_status: ApprovalStatus | null;
}

export type VerificationStep = { email: string } | null;

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: AppSession | null;
  profile: Profile | null;
  /** Convenience role flags: UI gating only; the DB remains the source of truth. */
  isSpecialAdmin: boolean;
  isVerifiedPresident: boolean;
  isClubAdmin: boolean;
  /** Re-reads the profile row, e.g. after a role/verification change. */
  refreshProfile: () => Promise<void>;
  /** Creates an @lwsd.org account. Returns whether a 6-digit code was sent. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; requiresCode: boolean }>;
  /** Exchanges the emailed code for a session, completing sign-up. */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  /** Signs in an already-verified @lwsd.org account. */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isInsforgeConfigured);

  const applySession = useCallback((user: { id: string; email: string } | null, refreshToken?: string | null) => {
    setSession(user ? { user } : null);
    if (refreshToken) {
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken).catch(() => {});
    } else if (refreshToken === null) {
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY).catch(() => {});
    }
  }, []);

  // Cold start: restore the session from the persisted refresh token.
  useEffect(() => {
    if (!insforge) return;
    let active = true;
    (async () => {
      const storedToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (storedToken) {
        const { data, error } = await insforge.auth.refreshSession({ refreshToken: storedToken });
        if (!active) return;
        if (!error && data) {
          applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? storedToken);
        } else {
          applySession(null, null);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [applySession]);

  const loadProfile = useCallback(async (userId: string) => {
    if (!insforge) return;
    const { data } = await insforge.database
      .from('profiles')
      .select('id, email, display_name, role, president_status')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    let active = true;
    void loadProfile(session.user.id).then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [session, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) return { error: 'Use your @lwsd.org school email.', requiresCode: false };
    if (!insforge) return { error: 'Backend not configured.', requiresCode: false };
    const { data, error } = await insforge.auth.signUp({ email: e, password });
    if (error) return { error: error.message, requiresCode: false };
    if (data?.requireEmailVerification) {
      return { error: null, requiresCode: true };
    }
    if (data?.accessToken && data.user) {
      applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? null);
    }
    return { error: null, requiresCode: false };
  }, [applySession]);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!insforge) return { error: 'Backend not configured.' };
    const { data, error } = await insforge.auth.verifyEmail({
      email: email.trim().toLowerCase(),
      otp: code.trim(),
    });
    if (error) return { error: error.message };
    if (data) applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? null);
    return { error: null };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) return { error: 'Use your @lwsd.org school email.' };
    if (!insforge) return { error: 'Backend not configured.' };
    const { data, error } = await insforge.auth.signInWithPassword({ email: e, password });
    if (error) return { error: error.message };
    if (data) applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? null);
    return { error: null };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await insforge?.auth.signOut();
    applySession(null, null);
    setProfile(null);
  }, [applySession]);

  return (
    <AuthContext.Provider
      value={{
        configured: isInsforgeConfigured,
        loading,
        session,
        profile,
        isSpecialAdmin: profile?.role === 'special_admin',
        isVerifiedPresident: profile?.role === 'verified_president',
        isClubAdmin: profile?.role === 'club_admin',
        refreshProfile,
        signUp,
        verifyCode,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
