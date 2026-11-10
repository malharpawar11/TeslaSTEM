import { useMemo } from "react";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { CATEGORIES, type Club, type ClubCategory } from "@/types/domain";
import { clubsByRoom, floorOf, roomOf } from "./plan";

export type CategoryFilter = "All" | ClubCategory;

/** "Tuesday & Wednesday, At Lunch", or null when neither is listed. */
export function schedule(club: Club) {
  const parts = [club.day, club.time].filter((p) => p && p !== "TBD");
  return parts.length ? parts.join(", ") : null;
}

export function floorWord(level: 1 | 2) {
  return level === 1 ? "first floor" : "second floor";
}

/**
 * Everything the map page shows, derived from the live club directory. Rooms
 * come from each club's own location; nothing here is typed in by hand.
 */
export function useClubMap(category: CategoryFilter) {
  const { clubs, loading, error, refresh } = useClubs();
  const { memberships } = useMemberships();

  const all = useMemo(() => clubsByRoom(clubs), [clubs]);
  const placed = useMemo(
    () => clubs.filter((c) => roomOf(c.location)),
    [clubs],
  );
  const shown = useMemo(
    () =>
      category === "All"
        ? all
        : clubsByRoom(clubs.filter((c) => c.category === category)),
    [all, clubs, category],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        [...shown.rooms.values()].map((r) => [r.room, r.clubs.length]),
      ),
    [shown],
  );

  const categoryCounts = useMemo(() => {
    const out: Partial<Record<CategoryFilter, number>> = { All: placed.length };
    for (const club of placed)
      out[club.category] = (out[club.category] ?? 0) + 1;
    return out;
  }, [placed]);
  const categories = useMemo(
    () =>
      ["All", ...CATEGORIES.filter((c) => categoryCounts[c])] as CategoryFilter[],
    [categoryCounts],
  );

  const floorCounts = useMemo(() => {
    const out = { 1: 0, 2: 0 } as Record<1 | 2, number>;
    for (const r of shown.rooms.values()) out[r.floor] += r.clubs.length;
    return out;
  }, [shown]);

  const myClubIds = useMemo(
    () =>
      new Set(
        [...memberships.values()]
          .filter((m) => m.status === "active")
          .map((m) => m.clubId),
      ),
    [memberships],
  );
  const myRooms = useMemo(
    () =>
      new Set(
        [...all.rooms.values()]
          .filter((r) => r.clubs.some((c) => myClubIds.has(c.id)))
          .map((r) => r.room),
      ),
    [all, myClubIds],
  );

  return {
    clubs,
    loading,
    error,
    refresh,
    rooms: all.rooms,
    unplaced: all.unplaced,
    shownRooms: shown.rooms,
    counts,
    categories,
    categoryCounts,
    floorCounts,
    myClubIds,
    myRooms,
  };
}

export interface SearchHit {
  club: Club;
  room: string | null;
  floor: 1 | 2 | undefined;
}

/** Clubs whose name, or room, matches what was typed. Names that start with it come first. */
export function searchClubs(clubs: Club[], query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const asRoom = q.replace(/^(rm|room)\s*/, "").toUpperCase();
  return clubs
    .map((club) => {
      const room = roomOf(club.location);
      const name = club.name.toLowerCase();
      const rank = name.startsWith(q)
        ? 0
        : name.split(/[\s(]+/).some((w) => w.startsWith(q))
          ? 1
          : name.includes(q)
            ? 2
            : room === asRoom || club.location.toLowerCase().includes(q)
              ? 3
              : -1;
      return { club, room, floor: room ? floorOf(room) : undefined, rank };
    })
    .filter((hit) => hit.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.club.name.localeCompare(b.club.name))
    .slice(0, limit)
    .map(({ rank: _, ...hit }) => hit);
}
