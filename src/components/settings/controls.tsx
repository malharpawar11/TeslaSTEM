import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { useHover, webFade } from "@/components/system";
import {
  SETTINGS_MOTION_MS,
  SETTINGS_RADIUS,
  SETTINGS_SPACE,
  SETTINGS_TYPE,
} from "./tokens";

const KNOB_TRAVEL = 18;
const SEGMENT_WIDTH = 78;

/** Phones get a full 44px touch target; desktop controls stay at 40. */
function useControlHeight() {
  const { width } = useWindowDimensions();
  return width < 640 ? SETTINGS_SPACE.controlTouch : SETTINGS_SPACE.control;
}

/** One section: its name in the margin, its rows beside it. */
export function SettingsSection({
  title,
  note,
  twoColumn,
  children,
}: {
  title: string;
  note?: string;
  twoColumn: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={`border-t border-light-border dark:border-dark-border ${twoColumn ? "flex-row" : ""}`}
      style={{
        paddingVertical: SETTINGS_SPACE.sectionPad - SETTINGS_SPACE.rowPad,
        gap: twoColumn ? SETTINGS_SPACE.columnGap : 2,
      }}
    >
      <View
        style={
          twoColumn
            ? {
                width: SETTINGS_SPACE.sectionColumn,
                paddingTop: SETTINGS_SPACE.rowPad,
              }
            : { paddingTop: SETTINGS_SPACE.rowPad }
        }
      >
        <Text
          accessibilityRole="header"
          className="text-light-text dark:text-dark-text"
          style={SETTINGS_TYPE.section}
        >
          {title}
        </Text>
        {note ? (
          <Text
            className="mt-0.5 text-light-muted dark:text-dark-muted"
            style={SETTINGS_TYPE.description}
          >
            {note}
          </Text>
        ) : null}
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        {children}
      </View>
    </View>
  );
}

/** The divider sits between rows, never above the first one. */
export function RowDivider() {
  return <View className="h-px bg-light-hairline dark:bg-dark-hairline" />;
}

export function RowText({
  label,
  description,
  minWidth = 180,
}: {
  label: string;
  description?: string;
  minWidth?: number;
}) {
  return (
    <View className="flex-1" style={{ minWidth }}>
      <Text
        className="text-light-text dark:text-dark-text"
        style={SETTINGS_TYPE.label}
      >
        {label}
      </Text>
      {description ? (
        <Text
          className="mt-0.5 text-light-muted dark:text-dark-muted"
          style={SETTINGS_TYPE.description}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingRow({ children }: { children: ReactNode }) {
  return (
    <View
      className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3"
      style={{ paddingVertical: SETTINGS_SPACE.rowPad }}
    >
      {children}
    </View>
  );
}

/** The whole row is the control, so it's an easy target at any width. */
export function SwitchRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const { hovered, hoverProps } = useHover();
  const x = useSharedValue(value ? KNOB_TRAVEL : 0);
  useEffect(() => {
    const to = value ? KNOB_TRAVEL : 0;
    x.value = reduced ? to : withTiming(to, { duration: SETTINGS_MOTION_MS });
  }, [value, reduced, x]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const toggle = () => {
    if (!disabled) onChange(!value);
  };
  // Browsers only give Space to real buttons, so switches handle it themselves.
  const onKeyDown = (event: {
    nativeEvent: { key: string };
    preventDefault?: () => void;
  }) => {
    if (event.nativeEvent.key !== " ") return;
    event.preventDefault?.();
    toggle();
  };
  return (
    <View {...(Platform.OS === "web" ? ({ onKeyDown } as object) : null)}>
      <Pressable
        onPress={toggle}
        disabled={disabled}
        {...hoverProps}
        accessibilityRole="switch"
        aria-checked={value}
        aria-disabled={disabled}
        accessibilityLabel={label}
        className="flex-row items-center justify-between gap-6"
        style={{
          paddingVertical: SETTINGS_SPACE.rowPad,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <RowText label={label} description={description} />
        <View className="flex-row items-center gap-2.5">
          <Text
            className="text-light-muted dark:text-dark-muted"
            style={[SETTINGS_TYPE.small, { width: 22, textAlign: "right" }]}
          >
            {value ? "On" : "Off"}
          </Text>
          <View
            className={`justify-center rounded-[3px] ${value ? "bg-python-green" : "bg-light-border-strong dark:bg-dark-border-strong"}`}
            style={[
              {
                width: 40,
                height: 22,
                paddingHorizontal: 2,
                opacity: hovered && !disabled ? 0.85 : 1,
              },
              webFade("background-color, opacity"),
            ]}
          >
            <Animated.View
              className="rounded-[2px] bg-white"
              style={[{ width: 18, height: 18 }, knob]}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function Segment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const height = useControlHeight() - 2;
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      aria-pressed={selected}
      accessibilityLabel={`${label} theme`}
      className="items-center justify-center"
      style={{ width: SEGMENT_WIDTH, height }}
    >
      <Text
        className={
          selected || hovered
            ? "text-light-text dark:text-dark-text"
            : "text-light-muted dark:text-dark-muted"
        }
        style={[SETTINGS_TYPE.segment, webFade("color")]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A compact two-way choice with a thumb that slides to the selected side. */
export function ThemeSegments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const reduced = useReducedMotion();
  const target = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSharedValue(target * SEGMENT_WIDTH);
  useEffect(() => {
    const to = target * SEGMENT_WIDTH;
    x.value = reduced ? to : withTiming(to, { duration: SETTINGS_MOTION_MS });
  }, [target, reduced, x]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <View
      role="group"
      aria-label="Color theme"
      className="relative flex-row border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface"
      style={{ borderRadius: SETTINGS_RADIUS }}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute bottom-0 left-0 top-0 border border-light-border-strong bg-light-bg dark:border-dark-border-strong dark:bg-dark-surface-2"
        style={[{ width: SEGMENT_WIDTH, borderRadius: SETTINGS_RADIUS }, thumb]}
      />
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

export function SettingsButton({
  label,
  onPress,
  primary,
  busy,
  busyLabel,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { hovered, hoverProps } = useHover();
  const minHeight = useControlHeight();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-busy={busy}
      aria-disabled={off}
      className={`justify-center border px-3.5 ${
        primary
          ? `border-python-blue ${hovered && !off ? "bg-python-blue-dark" : "bg-python-blue"}`
          : hovered && !off
            ? "border-light-text dark:border-dark-text"
            : "border-light-border-strong dark:border-dark-border-strong"
      }`}
      style={[
        {
          minHeight,
          borderRadius: SETTINGS_RADIUS,
          opacity: disabled ? 0.5 : 1,
        },
        webFade("background-color, border-color"),
      ]}
    >
      <Text
        className={
          primary ? "text-white" : "text-light-text dark:text-dark-text"
        }
        style={SETTINGS_TYPE.button}
      >
        {busy ? (busyLabel ?? label) : label}
      </Text>
    </Pressable>
  );
}
