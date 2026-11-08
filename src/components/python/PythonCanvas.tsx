import type { PythonSceneProps } from "./types";

/** Native builds have no WebGL view; Python shows the school crest instead. */
export default function PythonCanvas(_: PythonSceneProps) {
  return null;
}
