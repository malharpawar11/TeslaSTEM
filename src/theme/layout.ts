import { Platform, useWindowDimensions } from "react-native";

export const isWebsite = Platform.OS === "web";
export const NATIVE_TAB_MAX_WIDTH = 1280;
export const DESKTOP_NAV_WIDTH = 920;

export function useWebsiteLayout() {
  const { width } = useWindowDimensions();
  return {
    wide: isWebsite && width >= DESKTOP_NAV_WIDTH,
    width,
    gutter: width >= 1600 ? 40 : width >= DESKTOP_NAV_WIDTH ? 32 : 20,
  };
}
