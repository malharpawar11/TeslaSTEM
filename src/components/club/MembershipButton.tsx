import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/CampusVisual";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useHover, webFade } from "@/components/system";
import { CLUB, PANEL_SPACE, PANEL_TYPE } from "./tokens";

export type MembershipState =
  | "signedOut"
  | "open"
  | "approval"
  | "pending"
  | "joined";

const LABEL: Record<MembershipState, string> = {
  signedOut: "Sign in to join",
  open: "Join club",
  approval: "Request to join",
  pending: "Waiting for approval",
  joined: "Joined",
};
const BUSY: Partial<Record<MembershipState, string>> = {
  open: "Joining",
  approval: "Sending request",
  pending: "Withdrawing",
  joined: "Leaving",
};
const HOVER: Partial<Record<MembershipState, string>> = {
  pending: "Withdraw request",
  joined: "Leave club",
};

/**
 * One control for the whole membership lifecycle. A confirmed join flashes
 * green once; afterwards the button rests quietly and offers leaving on hover.
 */
export function MembershipButton({
  state,
  busy,
  onPress,
}: {
  state: MembershipState;
  busy: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const { hovered, hoverProps } = useHover();
  const [celebrate, setCelebrate] = useState(false);
  const previous = useRef(state);
  const pressedJoin = useRef(false);
  const [width, setWidth] = useState(0);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    // Only a join made here, not memberships arriving when the page loads.
    if (state !== "joined" || (was !== "open" && was !== "approval")) return;
    if (!pressedJoin.current) return;
    pressedJoin.current = false;
    setCelebrate(true);
    const timer = setTimeout(() => setCelebrate(false), 1500);
    return () => clearTimeout(timer);
  }, [state]);

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (busy && !reduced) {
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 900 }), -1, false);
    } else {
      cancelAnimation(sweep);
    }
  }, [busy, reduced, sweep]);
  const bar = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * 0.35 + sweep.value * width * 1.35 }],
  }));

  const solid =
    state === "signedOut" || state === "open" || state === "approval";
  const swapped = hovered && !busy && !celebrate;
  const label = busy
    ? (BUSY[state] ?? LABEL[state])
    : swapped && HOVER[state]
      ? HOVER[state]!
      : LABEL[state];

  const surface = celebrate
    ? "border-python-green"
    : solid
      ? swapped
        ? "bg-python-blue-dark border-python-blue-dark"
        : "bg-python-blue border-python-blue"
      : swapped
        ? "border-danger"
        : "border-light-border-strong dark:border-dark-border-strong";
  const ink = solid
    ? "text-white"
    : swapped
      ? "text-danger"
      : state === "pending"
        ? "text-warn"
        : "text-light-text dark:text-dark-text";
  const showCheck = state === "joined" && !swapped && !busy;

  return (
    <Pressable
      onPress={() => {
        pressedJoin.current = state === "open" || state === "approval";
        onPress();
      }}
      disabled={busy}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={
        state === "joined"
          ? "Leave club"
          : state === "pending"
            ? "Waiting for approval. Withdraw request"
            : LABEL[state]
      }
      aria-busy={busy}
      aria-disabled={busy}
      className={`relative flex-row items-center justify-center gap-2 overflow-hidden rounded-[4px] border ${surface}`}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          height: PANEL_SPACE.buttonHeight,
          transform: [{ scale: pressed && !reduced ? 0.99 : 1 }],
        },
        webFade("background-color, border-color, transform"),
      ]}
    >
      {showCheck ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(CLUB.panelMs)}
        >
          <Ionicons name="checkmark" size={16} color="#5CB82E" />
        </Animated.View>
      ) : null}
      <Text className={ink} style={PANEL_TYPE.button}>
        {label}
      </Text>
      {busy && !reduced ? (
        <View
          className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden"
          pointerEvents="none"
        >
          <Animated.View
            className={`h-full ${solid ? "bg-white" : "bg-python-blue"}`}
            style={[{ width: "35%" }, bar]}
          />
        </View>
      ) : null}
    </Pressable>
  );
}
