import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AppRole, ApprovalStatus } from '@/types/domain';

export type { AppRole } from '@/types/domain';

/**
 * The signed-in user's profile row. `role` and `president_status` are read
 * straight from `public.profiles` and are only ever set by the database
 * (RLS + the SECURITY DEFINER RPCs in migration 003). The client treats
 * them as display hints — every privileged action is re-checked server-side.
 */
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  /** President-verification lifecycle. `null` = never requested. */
  president_status: ApprovalStatus | null;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Convenience role flags — UI gating only; the DB remains the source of truth. */
  isSpecialAdmin: boolean;
  isVerifiedPresident: boolean;
  isClubAdmin: boolean;
  /** Re-reads the profile row, e.g. after a role/verification change. */
  refreshProfile: () => Promise<void>;
  /** Sends a 6-digit code to an @lwsd.org address. In-app, no browser/deep-link. */
  requestOtp: (email: string) => Promise<{ error: string | null }>;
  /** Exchanges the emailed code for a session. */
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// Frontend gate. The backend repeats this check: the profiles.email CHECK
// constraint and the handle_new_user() trigger both reject non-LWSD emails,
// so a tampered client still cannot create a non-LWSD account.
const LWSD_RE = /@lwsd\.org$/i;
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, president_status')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('id, email, display_name, role, president_status')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (active) setProfile((data as Profile) ?? null);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const requestOtp = useCallback(async (email: string) => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) return { error: 'Use your @lwsd.org school email.' };
    if (!supabase) return { error: 'Backend not configured.' };
    const { error } = await supabase.auth.signInWithOtp({ email: e });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) return { error: 'Backend not configured.' };
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        configured: isSupabaseConfigured,
        loading,
        session,
        profile,
        isSpecialAdmin: profile?.role === 'special_admin',
        isVerifiedPresident: profile?.role === 'verified_president',
        isClubAdmin: profile?.role === 'club_admin',
        refreshProfile,
        requestOtp,
        verifyOtp,
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
