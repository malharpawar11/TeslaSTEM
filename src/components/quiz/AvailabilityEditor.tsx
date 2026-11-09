import { createElement, useMemo, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useHover, webFade } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import {
  DAYS,
  MEETING_PERIODS,
  minutes,
  type Availability,
} from "@/lib/discovery";
import { surfaces } from "@/theme/tokens";
import { Choice } from "./Choice";
import { windowTime } from "./explain";
import { QUIZ_RADIUS, QUIZ_SPACE, QUIZ_TYPE } from "./tokens";

const CUSTOM = "Custom time";
const MAX_WINDOWS = 28;
// In the order a school day happens, with the free-form option last.
const OPTIONS = [
  "Before School",
  ...MEETING_PERIODS.filter((p) => p !== "Before School"),
  CUSTOM,
];

function TimeField({
  label,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const { isDark } = useTheme();
  const ink = isDark ? surfaces.dark : surfaces.light;
  const border = invalid ? "#D6402F" : ink.borderStrong;
  return (
    <View style={{ width: 160, flexGrow: 1, maxWidth: 200 }}>
      <Text
        className="mb-1 text-light-secondary dark:text-dark-secondary"
        style={QUIZ_TYPE.fieldLabel}
      >
        {label}
      </Text>
      {Platform.OS === "web" ? (
        // A native time field shows the student's 12-hour clock while its
        // value stays in the 24-hour form the app already stores.
        createElement("input", {
          type: "time",
          value,
          "aria-label": label,
          "aria-invalid": invalid || undefined,
          "aria-describedby": describedBy,
          onChange: (event: { target: { value: string } }) =>
            onChange(event.target.value),
          style: {
            height: QUIZ_SPACE.controlHeight,
            boxSizing: "border-box",
            width: "100%",
            padding: "0 10px",
            borderRadius: QUIZ_RADIUS,
            border: `1px solid ${border}`,
            background: "transparent",
            color: ink.text,
            fontFamily: "Atkinson, sans-serif",
            fontSize: QUIZ_TYPE.input.fontSize,
            colorScheme: isDark ? "dark" : "light",
          },
        })
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          accessibilityLabel={`${label}, 24-hour time`}
          placeholder="15:00"
          placeholderTextColor={ink.muted}
          style={{
            height: QUIZ_SPACE.controlHeight,
            paddingHorizontal: 10,
            borderRadius: QUIZ_RADIUS,
            borderWidth: 1,
            borderColor: border,
            color: ink.text,
            fontSize: QUIZ_TYPE.input.fontSize,
          }}
        />
      )}
    </View>
  );
}

function RemoveButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-11 justify-center"
    >
      <Text
        className={
          hovered
            ? "text-danger underline"
            : "text-light-secondary underline dark:text-dark-secondary"
        }
        style={[QUIZ_TYPE.meta, webFade("color")]}
      >
        Remove
      </Text>
    </Pressable>
  );
}

/** The student's week, one line per day, in calendar order. */
function FreeTimeList({
  windows,
  onRemove,
}: {
  windows: Availability[];
  onRemove: (index: number) => void;
}) {
  const days = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        slots: windows
          .map((window, index) => ({ window, index }))
          .filter(({ window }) => window.day === day),
      })).filter((row) => row.slots.length),
    [windows],
  );
  if (!days.length)
    return (
      <Text
        className="mt-3 text-light-muted dark:text-dark-muted"
        style={QUIZ_TYPE.body}
      >
        Nothing added yet. Without a time, clubs aren't matched to your
        schedule.
      </Text>
    );
  return (
    <View className="mt-4 border-t border-light-border dark:border-dark-border">
      {days.map(({ day, slots }) => (
        <View
          key={day}
          className="flex-row border-b border-light-border dark:border-dark-border"
        >
          <Text
            className="pt-2.5 text-light-text dark:text-dark-text"
            style={[QUIZ_TYPE.question, { width: 116 }]}
          >
            {day}
          </Text>
          <View className="flex-1">
            {slots.map(({ window, index }) => (
              <View
                key={index}
                className="flex-row items-center justify-between gap-3"
              >
                <Text
                  className="shrink text-light-text dark:text-dark-text"
                  style={QUIZ_TYPE.body}
                >
                  {windowTime(window)}
                </Text>
                <RemoveButton
                  label={`Remove ${day}, ${windowTime(window)}`}
                  onPress={() => onRemove(index)}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const ERROR_ID = "quiz-time-error";

export function AvailabilityEditor({
  windows,
  onChange,
  phone,
}: {
  windows: Availability[];
  onChange: (next: Availability[]) => void;
  phone: boolean;
}) {
  const [day, setDay] = useState("Monday");
  const [period, setPeriod] = useState<string>("At Lunch");
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("16:00");
  const [problem, setProblem] = useState<string | null>(null);

  const custom = period === CUSTOM;
  const range = useMemo(() => {
    if (!custom) return null;
    const from = minutes(start);
    const until = minutes(end);
    if (
      !/^\d{2}:\d{2}$/.test(start) ||
      !/^\d{2}:\d{2}$/.test(end) ||
      from === null ||
      until === null
    )
      return "Enter both a start and an end time.";
    return until <= from ? "The end time needs to be after the start." : null;
  }, [custom, start, end]);

  const candidate: Availability = custom
    ? { day, start, end }
    : { day, start: "", end: "", period };
  const shown = range ?? problem;

  const add = () => {
    if (range) return;
    if (windows.length >= MAX_WINDOWS) {
      setProblem(`You can add up to ${MAX_WINDOWS} times.`);
      return;
    }
    const same = windows.some(
      (w) => w.day === day && windowTime(w) === windowTime(candidate),
    );
    if (same) {
      setProblem(`${day}, ${windowTime(candidate)} is already in your week.`);
      return;
    }
    setProblem(null);
    onChange([...windows, candidate]);
  };

  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  const addLabel = range ? "Add time" : `Add ${day}, ${windowTime(candidate)}`;
  const tile = phone ? "46%" : "23%";

  return (
    <View>
      <Text
        accessibilityRole="header"
        className="text-light-text dark:text-dark-text"
        style={QUIZ_TYPE.section}
      >
        When are you free?
      </Text>
      <Text
        className="mt-1 text-light-secondary dark:text-dark-secondary"
        style={QUIZ_TYPE.body}
      >
        Pick a day and a time, then add it to your week. All times are Pacific.
      </Text>

      <Text
        className="mt-4 text-light-text dark:text-dark-text"
        style={QUIZ_TYPE.question}
        nativeID="quiz-day"
      >
        Day
      </Text>
      <View
        role="group"
        aria-labelledby="quiz-day"
        className="mt-2 flex-row"
        style={{ gap: phone ? 4 : QUIZ_SPACE.control }}
      >
        {DAYS.map((d) => (
          <Choice
            key={d}
            showBox={false}
            label={d.slice(0, 3)}
            accessibilityLabel={d}
            selected={day === d}
            onPress={() => {
              setDay(d);
              setProblem(null);
            }}
            style={{ flex: 1, minWidth: 0 }}
          />
        ))}
      </View>

      <Text
        className="mt-4 text-light-text dark:text-dark-text"
        style={QUIZ_TYPE.question}
        nativeID="quiz-time"
      >
        Time
      </Text>
      <View
        role="group"
        aria-labelledby="quiz-time"
        className="mt-2 flex-row flex-wrap"
        style={{ gap: QUIZ_SPACE.control }}
      >
        {OPTIONS.map((option) => (
          <Choice
            key={option}
            showBox={false}
            label={option}
            selected={period === option}
            onPress={() => {
              setPeriod(option);
              setProblem(null);
            }}
            style={{ flexBasis: tile, flexGrow: 1 }}
          />
        ))}
      </View>

      {custom ? (
        <View
          className="mt-3 flex-row flex-wrap"
          style={{ gap: QUIZ_SPACE.stack }}
        >
          <TimeField
            label="From"
            value={start}
            onChange={(v) => {
              setStart(v);
              setProblem(null);
            }}
            invalid={Boolean(range)}
            describedBy={range ? ERROR_ID : undefined}
          />
          <TimeField
            label="Until"
            value={end}
            onChange={(v) => {
              setEnd(v);
              setProblem(null);
            }}
            invalid={Boolean(range)}
            describedBy={range ? ERROR_ID : undefined}
          />
        </View>
      ) : (
        <Text
          className="mt-2 text-light-muted dark:text-dark-muted"
          style={QUIZ_TYPE.meta}
        >
          Matches clubs listed in this school period.
        </Text>
      )}

      {shown ? (
        <Text
          nativeID={ERROR_ID}
          role="alert"
          className="mt-2 text-danger"
          style={QUIZ_TYPE.meta}
        >
          {shown}
        </Text>
      ) : null}

      <View className="mt-3 items-start">
        <Pressable
          onPress={add}
          {...hoverProps}
          accessibilityRole="button"
          aria-disabled={Boolean(range)}
          accessibilityLabel={addLabel}
          className={`flex-row items-center gap-2 border px-4 ${
            range
              ? "border-light-border dark:border-dark-border"
              : hovered
                ? "border-python-blue"
                : "border-light-text dark:border-dark-text"
          }`}
          style={[
            { height: QUIZ_SPACE.controlHeight, borderRadius: QUIZ_RADIUS },
            webFade("border-color"),
          ]}
        >
          <Ionicons
            name="add"
            size={18}
            color={
              range
                ? "#8A8A8A"
                : hovered
                  ? "#3068F0"
                  : isDark
                    ? "#FFFFFF"
                    : "#000000"
            }
          />
          <Text
            className={
              range
                ? "text-light-muted dark:text-dark-muted"
                : "text-light-text dark:text-dark-text"
            }
            style={QUIZ_TYPE.button}
          >
            {addLabel}
          </Text>
        </Pressable>
      </View>

      <FreeTimeList
        windows={windows}
        onRemove={(index) => {
          setProblem(null);
          onChange(windows.filter((_, i) => i !== index));
        }}
      />
    </View>
  );
}
