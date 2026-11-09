/** Width over height, leaving room for the head and tongue when it lunges. */
export const CORNER_ASPECT = 1.32;

export interface CornerPythonProps {
  /** False while it ducks out of sight between pages. */
  present: boolean;
  /** Reduced motion: one still pose, no animation. */
  still: boolean;
}
