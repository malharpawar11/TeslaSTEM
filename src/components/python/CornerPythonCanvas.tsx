import type { CornerPythonProps } from "./CornerPython.types";

/** Native builds have no WebGL view, so the mascot only appears on the web. */
export default function CornerPythonCanvas(_: CornerPythonProps) {
  return null;
}
