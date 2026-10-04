import { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, PressableScale } from "./ui";
import { brand } from "@/theme/tokens";
import { schoolDayKey } from "@/lib/calendar";

export function MonthCalendar({
  eventDays,
  selected,
  onSelect,
}: {
  eventDays: Set<string>;
  selected: string | null;
  onSelect: (day: string | null) => void;
}) {
  const today = schoolDayKey(new Date().toISOString());
  const [month, setMonth] = useState(
    () => new Date(`${today.slice(0, 7)}-01T12:00:00Z`),
  );
  const year = month.getUTCFullYear(),
    m = month.getUTCMonth();
  const first = new Date(Date.UTC(year, m, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const move = (direction: number) => {
    setMonth(new Date(Date.UTC(year, m + direction, 1, 12)));
    onSelect(null);
  };
  const label = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <Card className="p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text
          accessibilityRole="header"
          className="text-lg font-bold text-light-text dark:text-dark-text"
        >
          {label}
        </Text>
        <View className="flex-row gap-2">
          {([-1, 1] as const).map((direction) => (
            <PressableScale
              key={direction}
              accessibilityRole="button"
              accessibilityLabel={
                direction < 0 ? "Previous month" : "Next month"
              }
              onPress={() => move(direction)}
              className="h-11 w-11 items-center justify-center rounded-full bg-python-blue/10"
            >
              <Ionicons
                name={direction < 0 ? "chevron-back" : "chevron-forward"}
                size={18}
                color={brand.blue}
              />
            </PressableScale>
          ))}
        </View>
      </View>
      <View className="mb-2 flex-row">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text
            key={index}
            style={{ width: "14.285714%" }}
            className="text-center text-xs font-bold text-light-muted dark:text-dark-muted"
          >
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {Array.from(
          { length: Math.ceil((first + length) / 7) * 7 },
          (_, index) => {
            const day = index - first + 1;
            if (day < 1 || day > length)
              return (
                <View key={index} style={{ width: "14.285714%", height: 48 }} />
              );
            const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return (
              <View
                key={key}
                style={{ width: "14.285714%", height: 48, padding: 2 }}
              >
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${key}${eventDays.has(key) ? ", club events" : ""}`}
                  accessibilityState={{ selected: selected === key }}
                  onPress={() => onSelect(selected === key ? null : key)}
                  className={`flex-1 items-center justify-center rounded-xl ${selected === key ? "bg-python-blue" : key === today ? "bg-python-green/10" : ""}`}
                >
                  <Text
                    className={`text-sm font-semibold ${selected === key ? "text-white" : "text-light-text dark:text-dark-text"}`}
                  >
                    {day}
                  </Text>
                  {eventDays.has(key) ? (
                    <View
                      className={`mt-1 h-1 w-1 rounded-full ${selected === key ? "bg-white" : "bg-python-green"}`}
                    />
                  ) : null}
                </PressableScale>
              </View>
            );
          },
        )}
      </View>
      <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-xs text-light-muted dark:text-dark-muted">
          Green dots mark club events · Pacific time
        </Text>
        <Button
          label={selected ? "Show all dates" : "Today"}
          variant="ghost"
          size="sm"
          onPress={() => {
            onSelect(null);
            if (!selected)
              setMonth(new Date(`${today.slice(0, 7)}-01T12:00:00Z`));
          }}
        />
      </View>
    </Card>
  );
}
