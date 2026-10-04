import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchPreferences, savePreferences } from "@/data/discoveryRepo";
import { EMPTY_PREFERENCES, type StudentPreferences } from "@/lib/discovery";
import type { RpcResult } from "@/data/result";

const Context = createContext<{
  preferences: StudentPreferences;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (value: StudentPreferences) => Promise<RpcResult>;
} | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const current = useRef(userId);
  current.current = userId;
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setPreferences(EMPTY_PREFERENCES);
    setError(null);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchPreferences(userId);
      if (current.current !== userId) return;
      if (result.ok) setPreferences(result.value);
      else setError(result.error);
    } catch {
      if (current.current === userId)
        setError("Could not load your club preferences.");
    } finally {
      if (current.current === userId) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);
  const save = useCallback(
    async (value: StudentPreferences): Promise<RpcResult> => {
      if (!userId)
        return { ok: false, error: "Sign in to save your preferences." };
      try {
        const result = await savePreferences(value);
        if (result.ok && current.current === userId) {
          setPreferences(value);
          setError(null);
        }
        return result;
      } catch {
        return {
          ok: false,
          error: "Could not save your preferences. Try again.",
        };
      }
    },
    [userId],
  );
  return (
    <Context.Provider
      value={{
        preferences,
        loading: loading || authLoading,
        error,
        refresh,
        save,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider missing");
  return value;
}
