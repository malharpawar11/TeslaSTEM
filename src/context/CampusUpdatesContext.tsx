import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { insforge } from "@/lib/insforge";
import { useAuth } from "./AuthContext";
type Updates = {
  events: number;
  announcements: number;
  clubs: Record<string, number>;
  reconnected: number;
};
const Context = createContext<Updates>({
  events: 0,
  announcements: 0,
  clubs: {},
  reconnected: 0,
});
/** Only invalidates visible views. Every subsequent content read uses normal RLS. */
export function CampusUpdatesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [updates, setUpdates] = useState<Updates>({
    events: 0,
    announcements: 0,
    clubs: {},
    reconnected: 0,
  });
  useEffect(() => {
    const sdk = insforge;
    setUpdates({ events: 0, announcements: 0, clubs: {}, reconnected: 0 });
    if (!sdk || !uid) return;
    const channel = `member-content:${uid}`;
    let active = true;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const changed = (payload: { club_id?: string; area?: string }) => {
      if (
        !active ||
        AppState.currentState !== "active" ||
        !payload.club_id ||
        !["events", "announcements"].includes(payload.area ?? "")
      )
        return;
      const club = payload.club_id,
        area = payload.area;
      setUpdates((v) => ({
        ...v,
        events: v.events + (area === "events" ? 1 : 0),
        announcements: v.announcements + (area === "announcements" ? 1 : 0),
        clubs: { ...v.clubs, [club]: (v.clubs[club] ?? 0) + 1 },
      }));
    };
    const reconnect = () => {
      if (!active) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (active)
          setUpdates((v) => ({ ...v, reconnected: v.reconnected + 1 }));
      }, 300);
    };
    sdk.realtime.on("club_content_changed", changed);
    sdk.realtime.on("connect", reconnect);
    void (async () => {
      try {
        await sdk.realtime.connect();
        if (active) await sdk.realtime.subscribe(channel);
      } catch {
        /* Focus and foreground refresh still work during a connection outage. */
      }
    })();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") reconnect();
    });
    return () => {
      active = false;
      clearTimeout(debounce);
      app.remove();
      sdk.realtime.off("club_content_changed", changed);
      sdk.realtime.off("connect", reconnect);
      sdk.realtime.unsubscribe(channel);
    };
  }, [uid]);
  return <Context.Provider value={updates}>{children}</Context.Provider>;
}
export const useCampusUpdates = () => useContext(Context);
