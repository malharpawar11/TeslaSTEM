import type { StemSceneProps } from "./types";

/** Native builds have no WebGL view; StemWorld shows its fallback instead. */
export default function StemCanvas(_: StemSceneProps) {
  return null;
}
