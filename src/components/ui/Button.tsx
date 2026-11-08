import { ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./Pressable";
import { useTheme } from "@/context/ThemeContext";
import { ink, surfaces } from "@/theme/tokens";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "tonal"
  | "outline"
  | "success"
  | "destructive";
type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  className?: string;
  /** Render children instead of label (e.g. for richer content). */
  children?: ReactNode;
}

// `h-13` is not a Tailwind default, so heights are set explicitly here rather
// than through the scale: a missing height class silently collapses a button.
const SIZE: Record<
  Size,
  {
    h: number;
    px: string;
    text: string;
    icon: number;
    gap: string;
    radius: string;
  }
> = {
  sm: {
    h: 44,
    px: "px-3",
    text: "text-xs",
    icon: 14,
    gap: "gap-1.5",
    radius: "rounded-md",
  },
  md: {
    h: 40,
    px: "px-4",
    text: "text-sm",
    icon: 16,
    gap: "gap-2",
    radius: "rounded-md",
  },
  lg: {
    h: 48,
    px: "px-5",
    text: "text-base",
    icon: 18,
    gap: "gap-2",
    radius: "rounded-md",
  },
  xl: {
    h: 54,
    px: "px-6",
    text: "text-base",
    icon: 19,
    gap: "gap-2",
    radius: "rounded-md",
  },
};

const VARIANT: Record<
  Variant,
  {
    container: string;
    text: string;
    iconColor: string;
    iconColorDark: string;
    pressedOpacity: number;
  }
> = {
  // The main action on a page is always solid blue.
  primary: {
    container: "bg-python-blue",
    text: "text-white font-bold",
    iconColor: "#FFFFFF",
    iconColorDark: "#FFFFFF",
    pressedOpacity: 0.9,
  },
  secondary: {
    container:
      "bg-transparent border border-light-border-strong dark:border-dark-border-strong",
    text: "text-light-text dark:text-dark-text font-bold",
    iconColor: surfaces.light.secondary,
    iconColorDark: surfaces.dark.secondary,
    pressedOpacity: 0.8,
  },
  ghost: {
    container: "bg-transparent",
    text: "text-light-secondary dark:text-dark-secondary font-bold",
    iconColor: surfaces.light.secondary,
    iconColorDark: surfaces.dark.secondary,
    pressedOpacity: 0.6,
  },
  tonal: {
    container: "bg-light-surface-2 dark:bg-dark-surface-2",
    text: "text-light-text dark:text-dark-text font-bold",
    iconColor: surfaces.light.secondary,
    iconColorDark: surfaces.dark.secondary,
    pressedOpacity: 0.8,
  },
  outline: {
    container:
      "bg-transparent border-2 border-light-text dark:border-dark-text",
    text: "text-light-text dark:text-dark-text font-bold",
    iconColor: surfaces.light.text,
    iconColorDark: surfaces.dark.text,
    pressedOpacity: 0.7,
  },
  success: {
    container: "bg-laurel",
    text: "text-ink-night font-bold",
    iconColor: ink.night,
    iconColorDark: ink.night,
    pressedOpacity: 0.9,
  },
  destructive: {
    container: "bg-danger",
    text: "text-white font-bold",
    iconColor: "#FFFFFF",
    iconColorDark: "#FFFFFF",
    pressedOpacity: 0.9,
  },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  accessibilityLabel,
  className,
  children,
}: Props) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const off = disabled || loading;
  const { isDark } = useTheme();
  const iconColor = isDark ? v.iconColorDark : v.iconColor;

  return (
    <PressableScale
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      pressedOpacity={off ? 1 : v.pressedOpacity}
      scaleTo={off ? 1 : 0.985}
      style={{ height: s.h }}
      className={[
        "flex-row items-center justify-center",
        s.px,
        s.gap,
        s.radius,
        v.container,
        fullWidth ? "w-full" : "",
        off ? "opacity-45" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : icon ? (
        <Ionicons name={icon} size={s.icon} color={iconColor} />
      ) : null}
      {children ?? (
        <Text className={`${s.text} ${v.text}`} numberOfLines={1}>
          {label}
        </Text>
      )}
      {!loading && iconRight ? (
        <Ionicons name={iconRight} size={s.icon} color={iconColor} />
      ) : null}
    </PressableScale>
  );
}
