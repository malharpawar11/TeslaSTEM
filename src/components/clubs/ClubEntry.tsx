import { memo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, useHover, webFade } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import { DAYS, meetingDays } from "@/lib/discovery";
import { palette, semantic } from "@/theme/tokens";
import type { Club } from "@/types/domain";

/** Pulls "117" out of "Presentation Hall (RM 117)", door-plate style. */
export function roomParts(location: string) {
  if (location === "TBD") return { number: null, place: "Not listed yet" };
  const match = location.match(/\bRM\s*(\d+)/i);
  if (!match) return { number: null, place: location };
  const place = location
    .replace(/\(?\bRM\s*\d+\)?/i, "")
    .trim();
  return { number: match[1], place };
}

/** Mon–Fri at a glance, the same on every entry so a column of them scans. */
export function WeekMarks({ club }: { club: Club }) {
  const days = meetingDays(club.day);
  const weekdays = DAYS.slice(0, 5);
  if (!days.some((d) => weekdays.includes(d)))
    return (
      <Text className="text-base font-bold text-light-text dark:text-dark-text">
        {club.day}
      </Text>
    );
  return (
    <View className="flex-row" style={{ gap: 3 }} accessibilityElementsHidden>
      {weekdays.map((day) => {
        const met = days.includes(day);
        return (
          <View
            key={day}
            className={`h-7 w-7 items-center justify-center rounded-sm ${met ? "bg-python-blue" : "bg-light-surface-2 dark:bg-dark-surface-2"}`}
          >
            <Text
              className={`text-sm font-bold ${met ? "text-white" : "text-light-subtle dark:text-dark-subtle"}`}
            >
              {day.slice(0, 1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function JoinButton({
  club,
  joined,
  pending,
  onToggle,
}: {
  club: Club;
  joined: boolean;
  pending: boolean;
  onToggle: (club: Club) => Promise<void>;
}) {
  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  const [busy, setBusy] = useState(false);
  const label = joined
    ? hovered
      ? "Leave"
      : "Joined"
    : pending
      ? "Pending"
      : club.joinPolicy === "approval"
        ? "Request"
        : "Join";
  const quiet = joined || pending;
  const color = !quiet
    ? "#FFFFFF"
    : pending
      ? semantic.warn
      : isDark
        ? palette.green[300]
        : palette.green[500];
  return (
    <Pressable
      onPress={async (event) => {
        event.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
          await onToggle(club);
        } finally {
          setBusy(false);
        }
      }}
      {...hoverProps}
      accessibilityRole="button"
      aria-busy={busy}
      accessibilityLabel={joined ? `Leave ${club.name}` : `Join ${club.name}`}
      className={`h-12 flex-row items-center justify-center rounded-sm ${quiet ? "" : "bg-python-blue"}`}
      style={[
        { width: 112, opacity: hovered && !quiet ? 0.88 : 1 },
        webFade("opacity"),
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Animated.View
          key={label}
          entering={FadeIn.duration(160)}
          className="flex-row items-center gap-1.5"
        >
          {joined ? (
            <Ionicons
              name={hovered ? "close" : "checkmark"}
              size={20}
              color={color}
            />
          ) : pending ? (
            <Ionicons name="time-outline" size={18} color={color} />
          ) : null}
          <Display fontSize={24} style={{ color }}>
            {label}
          </Display>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** One entry in the directory. No card: type, a rule, and the week strip. */
export const ClubEntry = memo(function ClubEntry({
  club,
  joined,
  pending,
  wide,
  reasons,
  onOpen,
  onToggle,
}: {
  club: Club;
  joined: boolean;
  pending: boolean;
  wide: boolean;
  reasons: string[];
  onOpen: (id: string) => void;
  onToggle: (club: Club) => Promise<void>;
}) {
  const { hovered, hoverProps } = useHover();
  const room = roomParts(club.location);
  const when = (
    <View
      accessible
      accessibilityLabel={`Meets ${club.day}, ${club.time}`}
      style={wide ? { width: 164 } : undefined}
    >
      <WeekMarks club={club} />
      <Text
        numberOfLines={2}
        className="mt-1.5 text-sm font-bold text-light-secondary dark:text-dark-secondary"
      >
        {club.time}
      </Text>
    </View>
  );
  const where = (
    <View
      accessible
      accessibilityLabel={`Room ${room.number ?? room.place}`}
      style={wide ? { width: 112 } : undefined}
    >
      <Text className="text-sm text-light-muted dark:text-dark-muted">Room</Text>
      {room.number ? (
        <Display fontSize={36}>{room.number}</Display>
      ) : (
        <Text
          numberOfLines={2}
          className={`mt-0.5 text-base font-bold ${room.place === "Not listed yet" ? "text-light-muted dark:text-dark-muted" : "text-light-text dark:text-dark-text"}`}
        >
          {room.place}
        </Text>
      )}
      {room.number && room.place ? (
        <Text numberOfLines={1} className="text-xs text-light-muted dark:text-dark-muted">
          {room.place}
        </Text>
      ) : null}
    </View>
  );
  return (
    <Pressable
      onPress={() => onOpen(club.id)}
      {...hoverProps}
      accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
      className="border-b border-light-border py-5 dark:border-dark-border"
    >
      <View className="flex-row items-start justify-between gap-6">
        <View
          className="flex-1"
          style={[
            { minWidth: 0, transform: [{ translateX: hovered ? 6 : 0 }] },
            webFade("transform"),
          ]}
        >
          <View className="flex-row flex-wrap items-baseline gap-x-3">
            <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
              {club.category}
            </Text>
            {club.memberCount > 0 ? (
              <Text className="text-sm text-light-muted dark:text-dark-muted">
                {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
              </Text>
            ) : null}
            {reasons.length ? (
              <Text className="text-sm font-bold text-python-green dark:text-python-green-light">
                {reasons.join(", ")}
              </Text>
            ) : null}
          </View>
          <Display
            fontSize={wide ? 46 : 38}
            className={
              hovered
                ? "text-python-blue dark:text-python-blue-light"
                : "text-light-text dark:text-dark-text"
            }
            style={webFade("color")}
          >
            {club.name}
          </Display>
        </View>
        {wide ? (
          <JoinButton club={club} joined={joined} pending={pending} onToggle={onToggle} />
        ) : null}
      </View>

      <View className={`mt-2 ${wide ? "flex-row items-start gap-8" : ""}`}>
        <Text
          numberOfLines={wide ? 3 : 2}
          className="flex-1 text-base leading-6 text-light-secondary dark:text-dark-secondary"
        >
          {club.description}
        </Text>
        {wide ? (
          <>
            {when}
            {where}
          </>
        ) : (
          <View className="mt-4 flex-row items-start justify-between gap-5">
            {when}
            {where}
          </View>
        )}
      </View>

      {!wide ? (
        <View className="mt-4 items-start">
          <JoinButton club={club} joined={joined} pending={pending} onToggle={onToggle} />
        </View>
      ) : null}
    </Pressable>
  );
});
