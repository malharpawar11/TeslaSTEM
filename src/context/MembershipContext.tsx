import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyMemberships,
  joinClub as joinClubRpc,
  leaveClub as leaveClubRpc,
} from "@/data/membershipRepo";
import type { Membership, MembershipStatus } from "@/types/domain";

/**
 * The signed-in student's club memberships: the single source of truth for
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
  error: string | null;
  isMember: (clubId: string) => boolean;
  membershipFor: (clubId: string) => Membership | undefined;
  /** Number of clubs the student has actually joined (pending excluded). */
  joinedCount: number;
  join: (
    clubId: string,
  ) => Promise<
    { ok: true; status: MembershipStatus } | { ok: false; error: string }
  >;
  leave: (clubId: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | undefined>(
  undefined,
);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [memberships, setMemberships] = useState<Map<string, Membership>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError(null);
      setMemberships(new Map());
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchMyMemberships(userId);
      if (currentUser.current === userId) {
        setMemberships(new Map(rows.map((m) => [m.clubId, m])));
        setError(null);
      }
    } catch (failure) {
      if (currentUser.current === userId)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load your memberships.",
        );
    } finally {
      if (currentUser.current === userId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setMemberships(new Map());
    setError(null);
    void refresh();
  }, [refresh]);

  const join = useCallback<MembershipContextValue["join"]>(
    async (clubId) => {
      const res = await joinClubRpc(clubId);
      if (!res.ok) return { ok: false, error: res.error };
      if (currentUser.current !== userId)
        return { ok: false, error: "Your account changed. Try again." };
      const status = (res.value ?? "active") as MembershipStatus;
      setMemberships((prev) => {
        const next = new Map(prev);
        next.set(clubId, {
          clubId,
          role: prev.get(clubId)?.role ?? "member",
          status,
          boardStatus: prev.get(clubId)?.boardStatus ?? null,
          position: prev.get(clubId)?.position ?? null,
        });
        return next;
      });
      return { ok: true, status };
    },
    [userId],
  );

  const leave = useCallback(
    async (clubId: string) => {
      const res = await leaveClubRpc(clubId);
      if (!res.ok) return { ok: false, error: res.error };
      if (currentUser.current !== userId)
        return { ok: false, error: "Your account changed. Try again." };
      setMemberships((prev) => {
        const next = new Map(prev);
        next.delete(clubId);
        return next;
      });
      return { ok: true };
    },
    [userId],
  );

  const isMember = useCallback(
    (clubId: string) => memberships.get(clubId)?.status === "active",
    [memberships],
  );

  const membershipFor = useCallback(
    (clubId: string) => memberships.get(clubId),
    [memberships],
  );

  const joinedCount = useMemo(
    () => [...memberships.values()].filter((m) => m.status === "active").length,
    [memberships],
  );

  return (
    <MembershipContext.Provider
      value={{
        memberships,
        loading,
        error,
        isMember,
        membershipFor,
        joinedCount,
        join,
        leave,
        refresh,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMemberships(): MembershipContextValue {
  const ctx = useContext(MembershipContext);
  if (!ctx)
    throw new Error("useMemberships must be used within MembershipProvider");
  return ctx;
}
