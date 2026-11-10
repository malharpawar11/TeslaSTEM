import type { Club } from "@/types/domain";

/**
 * Both floors traced from the 2026–2027 clubs poster. Rectangles are
 * [left, top, right, bottom] in the poster's drawing units, with the long
 * corridor running left to right. They're drawings, not survey data, so
 * keep edits to what the poster shows.
 */
export type Rect = [number, number, number, number];

export interface Floor {
  level: 1 | 2;
  name: string;
  /** The floor itself. */
  slab: Rect[];
  /** Numbered classrooms, keyed by room number. */
  rooms: Record<string, Rect>;
  /** The main corridor. */
  halls: Rect[];
  /** Unnumbered offices, restrooms and storage, drawn low and plain. */
  service: Rect[];
  stairs: Rect[];
  /** Open to the floor below (shaded grey on the poster). */
  voids: Rect[];
}

export const FLOORS: Floor[] = [
  {
    level: 1,
    name: "First floor",
    slab: [
      [25, 70, 1435, 335],
      [655, 30, 740, 70],
      [530, 335, 740, 395],
    ],
    halls: [[25, 170, 1435, 225]],
    rooms: {
      "110": [70, 75, 255, 170],
      "111": [255, 62, 345, 170],
      "112": [345, 65, 450, 170],
      "113": [450, 70, 570, 170],
      "117": [740, 55, 910, 185],
      "120": [990, 85, 1115, 185],
      "121": [1115, 85, 1195, 185],
      "122": [1195, 90, 1275, 185],
      "123": [1275, 105, 1435, 190],
      "108": [75, 220, 170, 330],
      "105": [440, 225, 530, 330],
      "101": [650, 330, 740, 395],
      "127": [1030, 235, 1110, 330],
      "124": [1345, 240, 1425, 340],
    },
    service: [
      [570, 75, 655, 170],
      [655, 30, 740, 170],
      [910, 95, 990, 185],
      [400, 265, 440, 330],
      [530, 225, 740, 330],
      [740, 280, 860, 330],
      [950, 235, 1030, 330],
      [1110, 265, 1150, 330],
      [25, 220, 75, 330],
    ],
    stairs: [
      [25, 130, 70, 170],
      [915, 240, 950, 300],
    ],
    voids: [],
  },
  {
    level: 2,
    name: "Second floor",
    slab: [
      [35, 130, 1450, 295],
      [35, 30, 625, 130],
      [755, 15, 1450, 130],
    ],
    halls: [[35, 135, 1450, 182]],
    rooms: {
      "212": [85, 40, 270, 135],
      "213": [270, 28, 360, 135],
      "214": [360, 28, 450, 135],
      "215": [450, 28, 580, 135],
      "220": [1005, 25, 1130, 125],
      "221": [1130, 25, 1210, 125],
      "222": [1210, 20, 1290, 125],
      "223": [1290, 35, 1450, 125],
      "211": [95, 185, 180, 290],
      "208": [455, 180, 540, 290],
      "200A": [680, 230, 755, 290],
      "227": [1045, 165, 1120, 275],
      "224": [1365, 165, 1440, 290],
    },
    service: [
      [580, 28, 625, 135],
      [925, 30, 1005, 125],
      [540, 180, 680, 290],
      [410, 185, 455, 290],
      [960, 165, 1045, 275],
      [1120, 165, 1165, 275],
    ],
    stairs: [
      [40, 85, 85, 140],
      [925, 185, 960, 240],
    ],
    voids: [
      [755, 15, 925, 130],
      [180, 205, 410, 275],
      [755, 170, 925, 235],
      [1165, 185, 1360, 255],
    ],
  },
];

const ALL_ROOMS = new Map(
  FLOORS.flatMap((floor) =>
    Object.keys(floor.rooms).map((room) => [room, floor.level] as const),
  ),
);

export function floorOf(room: string): 1 | 2 | undefined {
  return ALL_ROOMS.get(room);
}

const ROOM_NUMBER = /(?:^|[^0-9A-Z])([12]\d{2}A?)(?![0-9])/i;

/** "RM 121" → "121", "Presentation Hall (RM 117)" → "117", "TBD" → null. */
export function roomOf(location: string | null | undefined): string | null {
  const room = location?.match(ROOM_NUMBER)?.[1]?.toUpperCase();
  return room && ALL_ROOMS.has(room) ? room : null;
}

/** The room's own name when the location gives one, like "Presentation Hall". */
export function roomName(location: string): string | null {
  const name = location
    .replace(/\(?\s*(?:RM|Room|Rm\.?)\s*[0-9]{3}A?\s*\)?/gi, "")
    .trim();
  return name && !/^\d/.test(name) ? name : null;
}

export interface RoomClubs {
  room: string;
  floor: 1 | 2;
  name: string | null;
  clubs: Club[];
}

export function clubsByRoom(clubs: Club[]) {
  const rooms = new Map<string, RoomClubs>();
  const unplaced: Club[] = [];
  for (const club of clubs) {
    const room = roomOf(club.location);
    if (!room) {
      unplaced.push(club);
      continue;
    }
    const entry = rooms.get(room) ?? {
      room,
      floor: floorOf(room)!,
      name: null,
      clubs: [],
    };
    entry.name ??= roomName(club.location);
    entry.clubs.push(club);
    rooms.set(room, entry);
  }
  for (const entry of rooms.values())
    entry.clubs.sort((a, b) => a.name.localeCompare(b.name));
  return { rooms, unplaced };
}
