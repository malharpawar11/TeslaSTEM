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

/**
 * Result of a sign-in / sign-up attempt. `requiresCode` means the account
 * exists but is unverified and a 6-digit code is now in the user's inbox;
 * the caller should show the code step.
 */
export interface AuthAttempt {
  error: string | null;
  requiresCode: boolean;
  /** Sign-up only: the address is already registered, so sign in instead. */
  existingAccount?: boolean;
}

/** InsForge error codes this flow has to branch on, not just display. */
const NEEDS_VERIFICATION = 'AUTH_NEED_VERIFICATION';
const EMAIL_EXISTS = 'AUTH_EMAIL_EXISTS';

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
  signUp: (email: string, password: string) => Promise<AuthAttempt>;
  /** Exchanges the emailed code for a session, completing sign-up. */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  /**
   * Signs in an @lwsd.org account. If the address exists but was never
   * verified, this sends a fresh code and reports `requiresCode: true` so the
   * caller can drop the user into the code step instead of dead-ending.
   */
  signIn: (email: string, password: string) => Promise<AuthAttempt>;
  /** Mails a new 6-digit code to an account that hasn't verified yet. */
  resendCode: (email: string) => Promise<{ error: string | null }>;
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

  const resendCode = useCallback(async (email: string) => {
    if (!insforge) return { error: 'Backend not configured.' };
    const { error } = await insforge.auth.resendVerificationEmail({
      email: email.trim().toLowerCase(),
    });
    return { error: error ? error.message : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthAttempt> => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) return { error: 'Use your @lwsd.org school email.', requiresCode: false };
    if (!insforge) return { error: 'Backend not configured.', requiresCode: false };
    const { data, error } = await insforge.auth.signUp({ email: e, password });
    if (error) {
      // Already registered. We can't tell from here whether that account is
      // verified, so don't guess; hand it to sign-in, which mails a fresh
      // code when the account turns out to be unverified.
      if (error.error === EMAIL_EXISTS) {
        return {
          error: 'That email already has an account; enter your password to sign in.',
          requiresCode: false,
          existingAccount: true,
        };
      }
      return { error: error.message, requiresCode: false };
    }
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
      // Codes get pasted from mail clients with stray spaces or dashes.
      otp: code.replace(/\D/g, ''),
    });
    if (error) return { error: error.message };
    if (data) applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? null);
    return { error: null };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthAttempt> => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) return { error: 'Use your @lwsd.org school email.', requiresCode: false };
    if (!insforge) return { error: 'Backend not configured.', requiresCode: false };
    const { data, error } = await insforge.auth.signInWithPassword({ email: e, password });
    if (error) {
      // Credentials were fine but the address was never verified. Mail a new
      // code (the original has almost certainly expired) and hand the caller
      // the code step. Without this the account is permanently unreachable:
      // sign-in rejects it and sign-up says the email is taken.
      if (error.error === NEEDS_VERIFICATION) {
        // A resend failure here (rate limit, mailer down) is not fatal: show
        // the code step anyway so a code the user already holds still works.
        await insforge.auth.resendVerificationEmail({ email: e });
        return { error: null, requiresCode: true };
      }
      return { error: error.message, requiresCode: false };
    }
    if (data) applySession({ id: data.user.id, email: data.user.email }, data.refreshToken ?? null);
    return { error: null, requiresCode: false };
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
        resendCode,
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
