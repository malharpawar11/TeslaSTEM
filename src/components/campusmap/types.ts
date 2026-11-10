export interface HoverPoint {
  room: string;
  /** Top of the room, in CSS pixels from the canvas's top-left corner. */
  x: number;
  y: number;
}

export interface CampusMapSceneProps {
  /** The floor being looked at; the other one slides away. */
  floor: 1 | 2;
  /** Clubs meeting in each room, by room number, after any filter. */
  counts: Record<string, number>;
  /** Rooms where the signed-in student's own clubs meet. */
  mine: Set<string>;
  selected: string | null;
  /** A room, or null when someone clicks the empty floor. */
  onSelect: (room: string | null) => void;
  onHover?: (hover: HoverPoint | null) => void;
  isDark: boolean;
  /** Reduced motion: changes snap instead of easing. */
  still: boolean;
}
