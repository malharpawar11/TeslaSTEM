import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  fetchNotifications,
  fetchNotificationPrefs,
  markNotificationsRead,
  saveNotificationPrefs,
  effectivePrefs,
  type PrefsRow,
} from '@/data/notificationsRepo';
import { setBadgeCount } from '@/lib/push';
import type { AppNotification, NotificationPrefs } from '@/types/domain';

/**
 * The notification inbox plus the per-club preference matrix.
 *
 * Refreshes happen on sign-in, on an explicit pull, and when the app returns
 * to the foreground — never on a timer, because a polling loop over a growing
 * inbox is the classic way to burn a project's egress budget.
 */

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  prefs: PrefsRow[];
  /** Effective settings for a club (its override, else the global default). */
  prefsFor: (clubId: string | null) => NotificationPrefs;
  savePrefs: (clubId: string | null, prefs: NotificationPrefs) => Promise<{ ok: boolean; error?: string }>;
  markRead: (ids?: number[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<PrefsRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setPrefs([]);
      return;
    }
    setLoading(true);
    const [rows, prefRows] = await Promise.all([
      fetchNotifications(60),
      fetchNotificationPrefs(userId),
    ]);
    setNotifications(rows);
    setPrefs(prefRows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Coming back from the background is the moment the inbox is most likely
  // stale, and it costs one request.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  );

  useEffect(() => {
    void setBadgeCount(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(async (ids?: number[]) => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: now } : n)),
    );
    await markNotificationsRead(ids);
  }, []);

  const prefsFor = useCallback(
    (clubId: string | null) => effectivePrefs(prefs, clubId),
    [prefs],
  );

  const savePrefs = useCallback(
    async (clubId: string | null, next: NotificationPrefs) => {
      const res = await saveNotificationPrefs(clubId, next);
      if (!res.ok) return { ok: false, error: res.error };
      setPrefs((prev) => {
        const others = prev.filter((p) => p.clubId !== clubId);
        return [...others, { clubId, ...next }];
      });
      return { ok: true };
    },
    [],
  );

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, prefs, prefsFor, savePrefs, markRead, refresh }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
