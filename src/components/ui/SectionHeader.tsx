import { ReactNode } from "react";
import { View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";

interface Props {
  /** Rarely needed. Only use it when it says something the title doesn't. */
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  size?: "sm" | "md" | "lg" | "display";
  className?: string;
}

const SIZE: Record<
  NonNullable<Props["size"]>,
  { title: string; description: string }
> = {
  sm: { title: "font-display text-2xl", description: "text-sm" },
  md: { title: "font-display text-3xl", description: "text-sm" },
  lg: { title: "font-display text-4xl", description: "text-base" },
  display: {
    title: "font-display text-5xl",
    description: "text-base",
  },
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  trailing,
  size = "md",
  className,
}: Props) {
  const s = SIZE[size];
  return (
    <View
      className={`flex-row items-center justify-between gap-3 ${className ?? ""}`}
    >
      <View className="flex-1">
        {eyebrow ? (
          <Text className="mb-1 text-xs font-medium text-light-muted dark:text-dark-muted">
            {eyebrow}
          </Text>
        ) : null}
        <Text className={`text-light-text dark:text-dark-text ${s.title}`}>
          {title}
        </Text>
        {description ? (
          <Text
            className={`mt-1 text-light-muted dark:text-dark-muted ${s.description}`}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
