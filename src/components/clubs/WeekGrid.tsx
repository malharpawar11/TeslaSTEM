import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useHover, webFade } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import { DAYS, meetingDays, meetingPeriods } from "@/lib/discovery";
import { ink, surface } from "@/theme/tokens";
import type { Club } from "@/types/domain";

const SCHOOL_DAYS = DAYS.slice(0, 5);
const PERIODS = [
  { value: "Before School", label: "Before school" },
  { value: "At Lunch", label: "Lunch" },
  { value: "After School", label: "After school" },
];
const LABEL_WIDTH = 66;
const CELL_HEIGHT = 54;

function Cell({
  day,
  period,
  count,
  max,
  on,
  exact,
  onPress,
}: {
  day: string;
  period: string;
  count: number;
  max: number;
  on: boolean;
  exact: boolean;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  const c = surface(isDark);
  const empty = count === 0;
  const share = count / max;
  const alpha = Math.round((0.14 + share * 0.5) * 255)
    .toString(16)
    .padStart(2, "0");
  const fill = on ? ink.blue : empty ? "transparent" : `${ink.blue}${alpha}`;
  const onDark = on || isDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={empty && !exact}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`${day} ${period}, ${count} ${count === 1 ? "club" : "clubs"}`}
      accessibilityState={{ selected: exact, disabled: empty && !exact }}
      className="flex-1 items-center justify-center rounded-sm"
      style={[
        {
          height: CELL_HEIGHT,
          backgroundColor: fill,
          borderWidth: 2,
          borderColor:
            hovered && !empty ? (isDark ? "#FFFFFF" : "#000000") : "transparent",
        },
        webFade("background-color, border-color"),
      ]}
    >
      <Text
        style={{
          fontSize: empty ? 15 : 18,
          fontWeight: "700",
          color: empty ? c.borderStrong : onDark ? "#FFFFFF" : "#000000",
        }}
      >
        {empty ? "–" : count}
      </Text>
    </Pressable>
  );
}

function AxisLabel({
  text,
  active,
  accessibilityLabel,
  onPress,
  align,
}: {
  text: string;
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  align: "center" | "left";
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      className={`min-h-11 flex-1 justify-center ${align === "center" ? "items-center" : ""}`}
    >
      <Text
        className={`text-sm font-bold ${
          active
            ? "text-python-blue dark:text-python-blue-light"
            : hovered
              ? "text-light-text dark:text-dark-text"
              : "text-light-secondary dark:text-dark-secondary"
        }`}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/**
 * The school week as a control: pick one square, a whole day, or a whole
 * period. Counts follow the other active filters, so a square only ever
 * promises what selecting it will actually show.
 */
export function WeekGrid({
  clubs,
  day,
  period,
  onChange,
}: {
  clubs: Club[];
  day: string;
  period: string;
  onChange: (day: string, period: string) => void;
}) {
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const club of clubs)
      for (const d of meetingDays(club.day))
        for (const p of meetingPeriods(club.time))
          out[`${d}|${p}`] = (out[`${d}|${p}`] ?? 0) + 1;
    return out;
  }, [clubs]);
  const max = Math.max(1, ...Object.values(counts));
  const anything = day !== "Any day" || period !== "Any time";
  return (
    <View>
      <View className="flex-row" style={{ paddingLeft: LABEL_WIDTH, gap: 3 }}>
        {SCHOOL_DAYS.map((d) => (
          <AxisLabel
            key={d}
            text={d.slice(0, 3)}
            align="center"
            accessibilityLabel={`All of ${d}`}
            active={day === d && period === "Any time"}
            onPress={() =>
              day === d && period === "Any time"
                ? onChange("Any day", "Any time")
                : onChange(d, "Any time")
            }
          />
        ))}
      </View>
      <View style={{ gap: 3 }}>
        {PERIODS.map(({ value, label }) => (
          <View key={value} className="flex-row items-center" style={{ gap: 3 }}>
            <View style={{ width: LABEL_WIDTH - 3 }}>
              <AxisLabel
                text={label}
                align="left"
                accessibilityLabel={`All ${value}`}
                active={period === value && day === "Any day"}
                onPress={() =>
                  period === value && day === "Any day"
                    ? onChange("Any day", "Any time")
                    : onChange("Any day", value)
                }
              />
            </View>
            {SCHOOL_DAYS.map((d) => {
              const exact = day === d && period === value;
              const on =
                anything &&
                (day === d || day === "Any day") &&
                (period === value || period === "Any time");
              return (
                <Cell
                  key={d}
                  day={d}
                  period={value}
                  count={counts[`${d}|${value}`] ?? 0}
                  max={max}
                  on={on}
                  exact={exact}
                  onPress={() =>
                    exact ? onChange("Any day", "Any time") : onChange(d, value)
                  }
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
