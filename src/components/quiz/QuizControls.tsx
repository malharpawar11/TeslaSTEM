import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, useHover, webFade } from "@/components/system";
import { WEEKDAYS, type Period } from "@/lib/clubMatch";
import type { Availability } from "@/lib/discovery";
import { QUIZ_RADIUS, QUIZ_SPACE, QUIZ_TYPE } from "./tokens";
import { windowLabel } from "./summary";

/** The tick in a chosen card's corner: state shown by shape, not colour alone. */
function Tick({ on, round }: { on: boolean; round: boolean }) {
  return (
    <View
      className={`h-6 w-6 items-center justify-center border-2 ${
        on ? "border-white bg-white" : "border-light-border-strong dark:border-dark-border-strong"
      }`}
      style={{ borderRadius: round ? 12 : 3 }}
    >
      {on ? <Ionicons name="checkmark" size={16} color="#3068F0" /> : null}
    </View>
  );
}

/** One answer. Multi-choice cards are checkboxes; single-choice ones are radios. */
export function OptionCard({
  title,
  label,
  selected,
  multi,
  small,
  onPress,
}: {
  title: string;
  label?: string;
  selected: boolean;
  multi: boolean;
  small?: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      {...hoverProps}
      accessibilityRole={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      accessibilityLabel={label ?? title}
      className={`flex-1 flex-row items-start justify-between gap-3 border-2 ${
        selected
          ? "border-python-blue bg-python-blue"
          : hovered
            ? "border-light-text bg-light-bg dark:border-dark-text dark:bg-dark-bg"
            : "border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg"
      }`}
      style={[
        {
          minHeight: small ? QUIZ_SPACE.smallCardMinHeight : QUIZ_SPACE.cardMinHeight,
          borderRadius: QUIZ_RADIUS,
          padding: small ? 12 : 14,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        webFade("background-color, border-color, transform"),
      ]}
    >
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Display
          fontSize={small ? QUIZ_TYPE.cardTitleSmall : QUIZ_TYPE.cardTitle}
          className={selected ? "text-white" : "text-light-text dark:text-dark-text"}
          style={{ lineHeight: (small ? QUIZ_TYPE.cardTitleSmall : QUIZ_TYPE.cardTitle) + 3 }}
        >
          {title}
        </Display>
        {label && label !== title ? (
          <Text
            className={`mt-1 ${selected ? "text-white" : "text-light-secondary dark:text-dark-secondary"}`}
            style={QUIZ_TYPE.cardLabel}
          >
            {label}
          </Text>
        ) : null}
      </View>
      <Tick on={selected} round={!multi} />
    </Pressable>
  );
}

const PERIOD_LABEL: Record<Period, string> = {
  "Before School": "Before school",
  "At Lunch": "Lunch",
  "After School": "After school",
};

function Cell({
  on,
  label,
  onPress,
}: {
  on: boolean;
  label: string;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="checkbox"
      aria-checked={on}
      accessibilityLabel={label}
      className={`flex-1 items-center justify-center border-2 ${
        on
          ? "border-python-blue bg-python-blue"
          : hovered
            ? "border-light-text dark:border-dark-text"
            : "border-light-border dark:border-dark-border"
      }`}
      style={[{ height: QUIZ_SPACE.controlHeight, borderRadius: QUIZ_RADIUS }, webFade("background-color, border-color")]}
    >
      {on ? (
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text className="text-white" style={QUIZ_TYPE.metaStrong}>
            Free
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Weekdays down the side, the meeting periods clubs actually use across the
 * top. A column heading toggles that period for every day.
 */
export function AvailabilityGrid({
  windows,
  periods,
  onChange,
  lunch,
  onLunch,
  showLunch,
}: {
  windows: Availability[];
  periods: Period[];
  onChange: (next: Availability[]) => void;
  lunch: "A" | "B" | null;
  onLunch: (next: "A" | "B" | null) => void;
  showLunch: boolean;
}) {
  const isOn = (day: string, period: Period) =>
    windows.some((w) => w.day === day && w.period === period);
  const toggle = (day: string, period: Period) =>
    onChange(
      isOn(day, period)
        ? windows.filter((w) => !(w.day === day && w.period === period))
        : [...windows, { day, start: "", end: "", period }],
    );
  const toggleColumn = (period: Period) => {
    const all = WEEKDAYS.every((d) => isOn(d, period));
    const rest = windows.filter((w) => w.period !== period);
    onChange(all ? rest : [...rest, ...WEEKDAYS.map((day) => ({ day, start: "", end: "", period }))]);
  };
  const custom = windows.filter((w) => !w.period);

  return (
    <View>
      <View className="flex-row items-end" style={{ gap: 8 }}>
        <View style={{ width: 92 }} />
        {periods.map((period) => {
          const all = WEEKDAYS.every((d) => isOn(d, period));
          return (
            <Pressable
              key={period}
              onPress={() => toggleColumn(period)}
              accessibilityRole="button"
              accessibilityLabel={`${all ? "Clear" : "Free every day"} ${PERIOD_LABEL[period].toLowerCase()}`}
              className="min-h-11 flex-1 items-center justify-end pb-1"
            >
              <Text className="text-center text-light-text dark:text-dark-text" style={QUIZ_TYPE.metaStrong}>
                {PERIOD_LABEL[period]}
              </Text>
              <Text className="text-center text-light-muted underline dark:text-dark-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                {all ? "clear" : "every day"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        {WEEKDAYS.map((day) => (
          <View key={day} className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="text-light-text dark:text-dark-text" style={[QUIZ_TYPE.body, { width: 92 }]}>
              {day}
            </Text>
            {periods.map((period) => (
              <Cell
                key={period}
                on={isOn(day, period)}
                label={`${day} ${PERIOD_LABEL[period].toLowerCase()}`}
                onPress={() => toggle(day, period)}
              />
            ))}
          </View>
        ))}
      </View>

      {showLunch ? (
        <View className="mt-6">
          <Text className="text-light-text dark:text-dark-text" style={QUIZ_TYPE.metaStrong}>
            Which lunch do you have?
          </Text>
          <View className="mt-2 flex-row" style={{ gap: 8 }}>
            {(["A", "B", null] as const).map((value) => (
              <View key={String(value)} style={{ flex: 1 }}>
                <OptionCard
                  title={value ? `${value} lunch` : "Not sure"}
                  selected={lunch === value}
                  multi={false}
                  small
                  onPress={() => onLunch(value)}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {custom.length ? (
        <View className="mt-6">
          <Text className="text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.meta}>
            Also saved from before:
          </Text>
          {custom.map((w, i) => (
            <View key={`${w.day}-${w.start}-${i}`} className="mt-1 flex-row items-center gap-3">
              <Text className="text-light-text dark:text-dark-text" style={QUIZ_TYPE.body}>
                {windowLabel(w)}
              </Text>
              <Pressable
                onPress={() => onChange(windows.filter((x) => x !== w))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${windowLabel(w)}`}
                className="min-h-11 justify-center"
              >
                <Text className="text-light-secondary underline dark:text-dark-secondary" style={QUIZ_TYPE.meta}>
                  Remove
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
