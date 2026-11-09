import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";

/**
 * Every heading on a club page except the club's name. Quiet bold text, so the
 * name stays the one piece of display type on the page.
 */
export function ClubHeading({
  fontSize,
  className = "text-light-text dark:text-dark-text",
  style,
  accessibilityRole,
  children,
}: {
  fontSize: number;
  className?: string;
  style?: StyleProp<TextStyle>;
  accessibilityRole?: "header";
  children: ReactNode;
}) {
  return (
    <Text
      accessibilityRole={accessibilityRole}
      className={`font-bold ${className}`}
      style={[{ fontSize, lineHeight: Math.round(fontSize * 1.28) }, style]}
    >
      {children}
    </Text>
  );
}
