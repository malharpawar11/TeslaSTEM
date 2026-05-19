import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Club } from '@/types/domain';
import { clubs as mockClubs } from '@/data/mockData';
import { fetchClubs, type ClubsSource } from '@/data/clubsRepo';

interface ClubsContextValue {
  clubs: Club[];
  getClub: (id: string) => Club | undefined;
  loading: boolean;
  /** 'mock' until/unless a configured backend responds. */
  source: ClubsSource;
  refresh: () => Promise<void>;
}

const ClubsContext = createContext<ClubsContextValue | undefined>(undefined);

export function ClubsProvider({ children }: { children: ReactNode }) {
  // Seed with mock data so the directory renders instantly and never blanks
  // out if the backend is slow or unconfigured.
  const [clubs, setClubs] = useState<Club[]>(mockClubs);
  const [source, setSource] = useState<ClubsSource>('mock');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { clubs: next, source: src } = await fetchClubs();
    setClubs(next);
    setSource(src);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getClub = useCallback((id: string) => clubs.find((c) => c.id === id), [clubs]);

  return (
    <ClubsContext.Provider value={{ clubs, getClub, loading, source, refresh }}>
      {children}
    </ClubsContext.Provider>
  );
}

export function useClubs(): ClubsContextValue {
  const ctx = useContext(ClubsContext);
  if (!ctx) throw new Error('useClubs must be used within ClubsProvider');
  return ctx;
}
