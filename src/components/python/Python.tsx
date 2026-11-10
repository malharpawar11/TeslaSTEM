import {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useState,
} from "react";
import { Image, Platform, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useReducedMotion } from "@/components/CampusVisual";
import { useTheme } from "@/context/ThemeContext";
import type { PythonSceneProps } from "./types";

const PythonCanvas = lazy(() =>
  import("@/components/Scenes3D").then((m) => ({ default: m.PythonCanvas })),
);

export function webGLAvailable() {
  if (Platform.OS !== "web" || typeof document === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory != null && nav.deviceMemory < 2) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class Boundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The school's own python, for native apps and devices without WebGL. */
function Crest() {
  return (
    <View className="flex-1 items-end justify-center pr-12" accessible={false}>
      <Image
        source={require("../../../assets/teslastemlogo.png")}
        style={{ width: 300, height: 340 }}
        resizeMode="contain"
        accessibilityLabel=""
      />
    </View>
  );
}

type Props = Omit<PythonSceneProps, "active" | "still" | "isDark"> & {
  /** Stops rendering while the hero is scrolled out of view. */
  visible: boolean;
};

export function Python({ visible, ...rest }: Props) {
  const focused = useIsFocused();
  const still = useReducedMotion();
  const { isDark } = useTheme();
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => setCanRender(webGLAvailable()), []);
  const crest = <Crest />;
  // Render nothing until the check runs, so devices that will get the real
  // scene never flash the fallback.
  if (canRender === null || rest.clubs.length === 0) return null;
  if (!canRender) return crest;
  return (
    <Boundary fallback={crest}>
      <Suspense fallback={null}>
        <PythonCanvas
          {...rest}
          isDark={isDark}
          active={focused && visible}
          still={still}
        />
      </Suspense>
    </Boundary>
  );
}
