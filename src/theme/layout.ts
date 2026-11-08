import { Platform, useWindowDimensions } from "react-native";

/** Below this the app is a phone or small tablet and uses the bottom bar. */
export const DESKTOP_NAV_WIDTH = 920;
export const RAIL_WIDTH = 216;

/** Kept for screens that read as a single document (forms, admin, policies). */
export const APP_MAX_WIDTH = 1180;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_NAV_WIDTH;
  const contentWidth = isDesktop ? width - RAIL_WIDTH : width;
  return {
    width,
    height,
    isDesktop,
    contentWidth,
    /** Content wide enough for a side column next to the main one. */
    isWide: contentWidth >= 1000,
    gutter: contentWidth >= 1000 ? 48 : contentWidth >= 640 ? 32 : 20,
  };
}
