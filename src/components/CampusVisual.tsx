import { ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";

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

/** Plain title block for the working screens (manage, admin, forms). */
export function PageIntro({
  title,
  description,
  trailing,
  children,
}: {
  /** Accepted for older call sites; these screens no longer print labels. */
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View className="mb-6">
      <View className="flex-row items-end justify-between gap-3">
        <Text
          accessibilityRole="header"
          className="flex-1 font-display text-light-text dark:text-dark-text"
          style={{ fontSize: 44, lineHeight: 44 }}
        >
          {title}
        </Text>
        {trailing}
      </View>
      {description ? (
        <Text className="mt-2 max-w-xl text-base text-light-muted dark:text-dark-muted">
          {description}
        </Text>
      ) : null}
      {children ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}
