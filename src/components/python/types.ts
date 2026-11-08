export interface SaddleClub {
  id: string;
  name: string;
  category: string;
}

/** Where the HTML title sits, in pixels within the canvas. */
export interface TitleBox {
  left: number;
  top: number;
  size: number;
  indent: number;
  lineHeight: number;
  lines: readonly string[];
  /** Horizontal limit for the python, in pixels. */
  right: number;
}

export interface PythonSceneProps {
  clubs: SaddleClub[];
  /** Saddles printed white: the clubs meeting in the chosen slot. */
  lit: Set<string>;
  isDark: boolean;
  placement: "side" | "stacked";
  title: TitleBox;
  /** Changing this sends a ripple down the body. */
  pulseKey: string;
  /** 0 at the top of the page, 1 once the hero has scrolled away. */
  scroll: { current: number };
  active: boolean;
  still: boolean;
  onHover: (club: SaddleClub | null) => void;
  onSelect: (club: SaddleClub) => void;
}
