import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import { fetchMyProfile } from '@/lib/db';
import type { Profile, Role } from '@/types/domain';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  isSpecialAdmin: boolean;
  canAdministerSomething: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await fetchMyProfile());
    } catch {
      // A profile read failure must not strand the user on a blank screen; the
      // session is still valid and screens fall back to the least-privileged view.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isBackendConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // The profile row is created by a database trigger during the first sign-in,
  // so it is fetched after the session settles rather than alongside it. Keyed on
  // the user id, not the session object, so an hourly token refresh (which hands
  // back a new object for the same user) does not refetch.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (userId) void refreshProfile();
    else setProfile(null);
  }, [userId, refreshProfile]);

  const value = useMemo<AuthState>(() => {
    const role = profile?.role ?? null;
    return {
      loading,
      session,
      profile,
      role,
      isSpecialAdmin: role === 'special_admin',
      canAdministerSomething:
        role === 'special_admin' || role === 'club_admin' || role === 'verified_president',
      refreshProfile,
    };
  }, [loading, session, profile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
