import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMyMemberships,
  joinClub as joinClubRpc,
  leaveClub as leaveClubRpc,
} from '@/data/membershipRepo';
import type { Membership, MembershipStatus } from '@/types/domain';

/**
 * The signed-in student's club memberships — the single source of truth for
 * "my clubs" across the dashboard, the directory, and the calendar.
 *
 * Membership is server state, not a local preference: the previous "follow"
 * list lived in AsyncStorage, which meant a student's clubs vanished on a new
 * device. Every mutation goes through an RPC and the local map is refreshed
 * from the answer.
 */

interface MembershipContextValue {
  memberships: Map<string, Membership>;
  loading: boolean;
  isMember: (clubId: string) => boolean;
  membershipFor: (clubId: string) => Membership | undefined;
  /** Number of clubs the student has actually joined (pending excluded). */
  joinedCount: number;
  join: (clubId: string) => Promise<{ ok: true; status: MembershipStatus } | { ok: false; error: string }>;
  leave: (clubId: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMemberships(new Map());
      return;
    }
    setLoading(true);
    const rows = await fetchMyMemberships(userId);
    setMemberships(new Map(rows.map((m) => [m.clubId, m])));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const join = useCallback<MembershipContextValue['join']>(
    async (clubId) => {
      const res = await joinClubRpc(clubId);
      if (!res.ok) return { ok: false, error: res.error };
      const status = (res.value ?? 'active') as MembershipStatus;
      setMemberships((prev) => {
        const next = new Map(prev);
        next.set(clubId, {
          clubId,
          role: prev.get(clubId)?.role ?? 'member',
          status,
          boardStatus: prev.get(clubId)?.boardStatus ?? null,
          position: prev.get(clubId)?.position ?? null,
        });
        return next;
      });
      return { ok: true, status };
    },
    [],
  );

  const leave = useCallback(async (clubId: string) => {
    const res = await leaveClubRpc(clubId);
    if (!res.ok) return { ok: false, error: res.error };
    setMemberships((prev) => {
      const next = new Map(prev);
      next.delete(clubId);
      return next;
    });
    return { ok: true };
  }, []);

  const isMember = useCallback(
    (clubId: string) => memberships.get(clubId)?.status === 'active',
    [memberships],
  );

  const membershipFor = useCallback((clubId: string) => memberships.get(clubId), [memberships]);

  const joinedCount = useMemo(
    () => [...memberships.values()].filter((m) => m.status === 'active').length,
    [memberships],
  );

  return (
    <MembershipContext.Provider
      value={{ memberships, loading, isMember, membershipFor, joinedCount, join, leave, refresh }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMemberships(): MembershipContextValue {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error('useMemberships must be used within MembershipProvider');
  return ctx;
}
