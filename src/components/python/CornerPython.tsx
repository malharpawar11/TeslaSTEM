import {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useState,
} from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { useReducedMotion } from "@/components/CampusVisual";
import { DESKTOP_NAV_WIDTH } from "@/theme/layout";

import { CORNER_ASPECT } from "./CornerPython.types";

const CornerPythonCanvas = lazy(() =>
  import("@/components/Scenes3D").then((m) => ({
    default: m.CornerPythonCanvas,
  })),
);

// It ducks out for this long when the page changes, then comes back.
const AWAY_MS = 620;
const STILL_VISIT_MS = 2700;
const LOAD_AFTER_MS = 1200;
const TAB_BAR = 64;
const CLUB_JOIN_BAR = 70;
const TAB_ROUTES = ["/", "/browse", "/calendar", "/notifications", "/account"];
// The quiz keeps its Save button pinned in this corner.
const HIDDEN_ROUTES = ["/onboarding"];

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webGLAvailable() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory != null && nav.deviceMemory < 2) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** The python that pops out of the bottom-right corner of every page. */
export function CornerPython() {
  const pathname = usePathname();
  const still = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [present, setPresent] = useState(false);

  // Waits until the page has settled, so it never slows the first load.
  useEffect(() => {
    if (Platform.OS !== "web" || !webGLAvailable()) return;
    const timer = setTimeout(() => setReady(true), LOAD_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPresent(false);
    if (HIDDEN_ROUTES.includes(pathname)) return;
    const show = setTimeout(() => setPresent(true), AWAY_MS);
    // With reduced motion it can't animate away, so it just stops showing.
    const hide = still
      ? setTimeout(() => setPresent(false), AWAY_MS + STILL_VISIT_MS)
      : undefined;
    return () => {
      clearTimeout(show);
      if (hide) clearTimeout(hide);
    };
  }, [pathname, still]);

  if (!ready) return null;
  const desktop = width >= DESKTOP_NAV_WIDTH;
  const bottom = desktop
    ? 0
    : TAB_ROUTES.includes(pathname)
      ? TAB_BAR
      : /^\/club\/[^/]+$/.test(pathname)
        ? CLUB_JOIN_BAR
        : 0;
  // Scaled to the window so it stays a proper presence on any screen.
  const side = desktop
    ? Math.round(Math.max(212, Math.min(312, Math.min(width, height) * 0.275)))
    : Math.round(Math.min(184, Math.min(width, height) * 0.385));
  const size = { width: Math.round(side * CORNER_ASPECT), height: side };
  return (
    <View
      aria-hidden
      pointerEvents="none"
      style={[
        { right: 0, bottom, zIndex: 20, ...size },
        { position: "fixed" } as object,
      ]}
    >
      <Boundary>
        <Suspense fallback={null}>
          <CornerPythonCanvas present={present} still={still} />
        </Suspense>
      </Boundary>
    </View>
  );
}
