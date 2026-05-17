import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tsp.follows';

interface FollowContextValue {
  follows: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
}

const FollowContext = createContext<FollowContextValue | undefined>(undefined);

export function FollowProvider({ children }: { children: ReactNode }) {
  const [follows, setFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setFollows(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const toggleFollow = useCallback(
    (id: string) => {
      setFollows((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
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
