import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'tsp.follows';

interface FollowContextValue {
  follows: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
}

const FollowContext = createContext<FollowContextValue | undefined>(undefined);

export function FollowProvider({ children }: { children: ReactNode }) {
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setFollows(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  // When signed in against a real backend, server follows are the source of
  // truth — load them and keep the local cache as an offline mirror.
  useEffect(() => {
    if (!insforge || !userId) return;
    let active = true;
    insforge.database
      .from('club_followers')
      .select('club_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (active && data) {
          setFollows(new Set(data.map((r: { club_id: string }) => r.club_id)));
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const persist = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const toggleFollow = useCallback(
    (id: string) => {
      setFollows((prev) => {
        const next = new Set(prev);
        const nowFollowing = !next.has(id);
        if (nowFollowing) next.add(id);
        else next.delete(id);
        persist(next);

        // Write through to the backend when signed in; failures are
        // swallowed so the optimistic local toggle still stands.
        if (insforge && userId) {
          const op = nowFollowing
            ? insforge.database.from('club_followers').upsert([{ club_id: id, user_id: userId }])
            : insforge.database
                .from('club_followers')
                .delete()
                .eq('club_id', id)
                .eq('user_id', userId);
          Promise.resolve(op).catch(() => {});
        }
        return next;
      });
    },
    [persist, userId],
  );

  const isFollowing = useCallback((id: string) => follows.has(id), [follows]);

  return (
    <FollowContext.Provider value={{ follows, isFollowing, toggleFollow }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollows(): FollowContextValue {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollows must be used within FollowProvider');
  return ctx;
}
