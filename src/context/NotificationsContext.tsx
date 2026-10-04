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
import { AppState } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchNotifications,
  fetchUnreadCount,
  fetchNotificationPrefs,
  markNotificationsRead,
  saveNotificationPrefs,
  effectivePrefs,
  type PrefsRow,
} from "@/data/notificationsRepo";
import { setBadgeCount } from "@/lib/push";
import type { AppNotification, NotificationPrefs } from "@/types/domain";

/**
 * The notification inbox plus the per-club preference matrix.
 *
 * Refreshes happen on sign-in, on an explicit pull, and when the app returns
 * to the foreground, never on a timer, because a polling loop over a growing
 * inbox is the classic way to burn a project's egress budget.
 */

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  prefs: PrefsRow[];
  /** Effective settings for a club (its override, else the global default). */
  prefsFor: (clubId: string | null) => NotificationPrefs;
  savePrefs: (
    clubId: string | null,
    prefs: NotificationPrefs,
  ) => Promise<{ ok: boolean; error?: string }>;
  markRead: (ids?: number[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const userId = session?.user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<PrefsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError(null);
      setNotifications([]);
      setUnreadCount(0);
      setPrefs([]);
      return;
    }
    setLoading(true);
    try {
      const [rows, prefRows, count] = await Promise.all([
        fetchNotifications(60),
        fetchNotificationPrefs(userId),
        fetchUnreadCount(),
      ]);
      if (currentUser.current !== userId) return;
      setNotifications(rows);
      setUnreadCount(count);
      setPrefs(prefRows);
      setError(null);
    } catch (failure) {
      if (currentUser.current === userId)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load notifications.",
        );
    } finally {
      if (currentUser.current === userId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setPrefs([]);
    setError(null);
    void refresh();
  }, [refresh]);

  // Coming back from the background is the moment the inbox is most likely
  // stale, and it costs one request.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  useEffect(() => {
    void setBadgeCount(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(
    async (ids?: number[]) => {
      const result = await markNotificationsRead(ids);
      if (currentUser.current !== userId) return;
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) =>
          !n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: now } : n,
        ),
      );
      void refresh();
    },
    [userId, toast, refresh],
  );

  const prefsFor = useCallback(
    (clubId: string | null) => effectivePrefs(prefs, clubId),
    [prefs],
  );

  const savePrefs = useCallback(
    async (clubId: string | null, next: NotificationPrefs) => {
      const res = await saveNotificationPrefs(clubId, next);
      if (currentUser.current !== userId)
        return { ok: false, error: "Your account changed. Try again." };
      if (!res.ok) return { ok: false, error: res.error };
      setPrefs((prev) => {
        const others = prev.filter((p) => p.clubId !== clubId);
        return [...others, { clubId, ...next }];
      });
      return { ok: true };
    },
    [userId],
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        prefs,
        prefsFor,
        savePrefs,
        markRead,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  return ctx;
}
