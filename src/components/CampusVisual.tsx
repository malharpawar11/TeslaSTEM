import { ReactNode, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { Gradient } from "./Gradient";

/** Respect the OS/browser preference and disable ambient motion off-screen. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

export function CampusVisual({ active = true }: { active?: boolean }) {
  const reduced = useReducedMotion();
  const [phase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced || !active) {
      phase.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 6500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 6500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduced, phase]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        style={{
          position: "absolute",
          right: -110,
          top: -100,
          width: 340,
          height: 340,
          borderRadius: 170,
          borderWidth: 44,
          borderColor: "#3985FF30",
          transform: [
            {
              translateY: phase.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 24],
              }),
            },
            { rotate: "-22deg" },
          ],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          right: -28,
          bottom: -100,
          width: 260,
          height: 260,
          borderRadius: 130,
          borderWidth: 32,
          borderColor: "#35D59B28",
          transform: [
            {
              translateX: phase.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -18],
              }),
            },
            {
              scale: phase.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.06],
              }),
            },
          ],
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 66,
          top: 78,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#72EBC0",
        }}
      />
    </View>
  );
}

export function PageIntro({
  eyebrow = "TESLA STEM / CAMPUS",
  title,
  description,
  trailing,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View className="mb-5 overflow-hidden rounded-3xl">
      <Gradient
        colors={["#102D63", "#123E53"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <CampusVisual active={false} />
        <View className="p-6">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="mb-3 text-2xs font-bold tracking-widest text-white/70">
                {eyebrow}
              </Text>
              <Text
                accessibilityRole="header"
                className="text-3xl font-bold tracking-tight text-white"
              >
                {title}
              </Text>
            </View>
            {trailing ?? (
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Ionicons name="sparkles-outline" size={23} color="#7DEBC3" />
              </View>
            )}
          </View>
          {description ? (
            <Text className="mt-2 max-w-lg text-sm leading-5 text-white/75">
              {description}
            </Text>
          ) : null}
          {children ? <View className="mt-5">{children}</View> : null}
        </View>
      </Gradient>
    </View>
  );
}
