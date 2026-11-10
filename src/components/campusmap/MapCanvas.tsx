import type { CampusMapSceneProps } from "./types";

/** Native builds have no WebGL view; the room list carries the map there. */
export default function MapCanvas(_: CampusMapSceneProps) {
  return null;
}
