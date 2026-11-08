import { Platform, useWindowDimensions } from "react-native";

export const isWebsite = Platform.OS === "web";
export const APP_MAX_WIDTH = 1280;
export const DESKTOP_NAV_WIDTH = 920;

export function useWebsiteLayout() {
  const { width } = useWindowDimensions();
  return {
    wide: isWebsite && width >= DESKTOP_NAV_WIDTH,
    contentWidth: Math.min(width, APP_MAX_WIDTH),
  };
}
