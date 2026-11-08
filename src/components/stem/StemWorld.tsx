import {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useState,
} from "react";
import { Platform, Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { Display } from "@/components/system";
import { useClubs } from "@/context/ClubsContext";
import { STAGES } from "./types";

const StemCanvas = lazy(() =>
  import("@/components/Scenes3D").then((m) => ({ default: m.StemCanvas })),
);

function webGLAvailable() {
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

/**
 * The 3D world and, in its corner, the real club each stage belongs to. The
 * caption updates at most every few seconds, so it never competes with typing.
 */
export function StemWorld({
  fallback,
  size = 34,
}: {
  fallback: ReactNode;
  size?: number;
}) {
  const focused = useIsFocused();
  const still = useReducedMotion();
  const router = useRouter();
  const { clubs } = useClubs();
  const [canRender, setCanRender] = useState<boolean | null>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => setCanRender(webGLAvailable()), []);

  if (canRender === null) return null;
  if (!canRender) return <>{fallback}</>;
  const current = STAGES[stage];
  const club = clubs.find((c) => c.name === current.club);
  return (
    <View className="absolute inset-0">
      <Boundary fallback={fallback}>
        <Suspense fallback={null}>
          <StemCanvas active={focused} still={still} onStage={setStage} />
        </Suspense>
      </Boundary>
      {club ? (
        <Animated.View
          key={stage}
          entering={still ? undefined : FadeIn.duration(260)}
          pointerEvents="box-none"
          className="absolute bottom-3"
          style={{ left: 48 }}
        >
          <Pressable
            onPress={() => router.push(`/club/${club.id}`)}
            accessibilityRole="link"
            accessibilityLabel={`${club.name}. Open club.`}
            className="hover:opacity-80"
          >
            <Text className="text-sm font-bold text-white">
              {current.subject}
            </Text>
            <Display fontSize={size} className="text-white">
              {club.name}
            </Display>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
