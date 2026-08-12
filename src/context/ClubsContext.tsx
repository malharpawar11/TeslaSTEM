import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Club } from '@/types/domain';
import { fetchClubs } from '@/data/clubsRepo';

interface ClubsContextValue {
  clubs: Club[];
  getClub: (id: string) => Club | undefined;
  loading: boolean;
  /** Non-null when the last load failed; the UI shows this instead of clubs. */
  error: string | null;
  refresh: () => Promise<void>;
}

const ClubsContext = createContext<ClubsContextValue | undefined>(undefined);

export function ClubsProvider({ children }: { children: ReactNode }) {
  // Starts empty. Seeding with placeholder clubs would render a directory of
  // clubs that do not exist while the real ones load or when loading fails.
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchClubs();
    setClubs(result.clubs);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getClub = useCallback((id: string) => clubs.find((c) => c.id === id), [clubs]);

  return (
    <ClubsContext.Provider value={{ clubs, getClub, loading, error, refresh }}>
      {children}
    </ClubsContext.Provider>
  );
}

export function useClubs(): ClubsContextValue {
  const ctx = useContext(ClubsContext);
  if (!ctx) throw new Error('useClubs must be used within ClubsProvider');
  return ctx;
}
