import { ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, Glyph } from "@/components/system";

/** A titled group of filters. Collapsible ones show their value when shut. */
export function FilterSection({
  title,
  children,
  collapsible = false,
  summary,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  summary?: string;
}) {
  const [open, setOpen] = useState(!collapsible);
  const heading = (
    <Display size="sm" accessibilityRole="header">
      {title}
    </Display>
  );
  return (
    <View className="mt-8">
      {collapsible ? (
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          aria-expanded={open}
          accessibilityLabel={summary ? `${title}: ${summary}` : title}
          className="min-h-11 flex-row items-center justify-between gap-3"
        >
          <View className="shrink">
            {heading}
            {!open && summary ? (
              <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
                {summary}
              </Text>
            ) : null}
          </View>
          <Glyph
            name={open ? "chevron-up" : "chevron-down"}
            size={20}
            tone="secondary"
          />
        </Pressable>
      ) : (
        <View className="mb-2">{heading}</View>
      )}
      {open ? (
        <Animated.View entering={FadeIn.duration(140)}>{children}</Animated.View>
      ) : null}
    </View>
  );
}
