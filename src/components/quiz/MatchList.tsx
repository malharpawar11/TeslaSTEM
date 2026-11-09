import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { useHover, webFade } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import type { StudentPreferences } from "@/lib/discovery";
import { surfaces } from "@/theme/tokens";
import type { Club } from "@/types/domain";
import { scheduleFit, whyItMatches } from "./explain";
import { MATCHES_PER_PAGE, QUIZ_MOTION, QUIZ_TYPE } from "./tokens";

export interface Match {
  club: Club;
  reasons: string[];
}

function MatchRow({
  match,
  closest,
  preferences,
  onOpen,
}: {
  match: Match;
  closest: boolean;
  preferences: StudentPreferences;
  onOpen: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const { isDark } = useTheme();
  const { club, reasons } = match;
  const why = whyItMatches(reasons);
  const fit = scheduleFit(club, reasons, preferences);
  const where = club.location === "TBD" ? null : club.location;
  const meets = [`Meets ${club.day}`, club.time, where]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      onPress={onOpen}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`${club.name}. ${why ?? ""} ${fit ? `${fit}.` : ""} ${meets}.`}
      className="border-b border-light-border py-4 dark:border-dark-border"
    >
      {closest ? (
        <Text
          className="text-python-blue dark:text-python-blue-light"
          style={QUIZ_TYPE.metaStrong}
        >
          Most in common
        </Text>
      ) : null}
      <View className="flex-row items-start justify-between gap-3">
        <Text
          className={
            hovered
              ? "shrink text-python-blue dark:text-python-blue-light"
              : "shrink text-light-text dark:text-dark-text"
          }
          style={[
            closest ? QUIZ_TYPE.matchTop : QUIZ_TYPE.match,
            webFade("color"),
          ]}
        >
          {club.name}
        </Text>
        <Text
          className="pt-0.5 text-light-muted dark:text-dark-muted"
          style={QUIZ_TYPE.meta}
        >
          {club.category}
        </Text>
      </View>
      {why ? (
        <Text
          className="mt-1 text-light-secondary dark:text-dark-secondary"
          style={QUIZ_TYPE.why}
        >
          {why}
        </Text>
      ) : null}
      {fit ? (
        <View className="mt-1 flex-row items-start gap-1.5">
          <Ionicons
            name="checkmark"
            size={16}
            color={isDark ? "#7FD955" : "#3A8F1E"}
            style={{ marginTop: 3 }}
          />
          <Text
            className="shrink text-python-green dark:text-python-green-light"
            style={QUIZ_TYPE.metaStrong}
          >
            {fit}
          </Text>
        </View>
      ) : null}
      <View className="mt-1 flex-row items-end justify-between gap-3">
        <Text
          className="shrink text-light-muted dark:text-dark-muted"
          style={QUIZ_TYPE.meta}
        >
          {meets}
        </Text>
        <View
          style={[
            { transform: [{ translateX: hovered ? 3 : 0 }] },
            webFade("transform"),
          ]}
        >
          <Ionicons
            name="arrow-forward"
            size={16}
            color={isDark ? surfaces.dark.muted : surfaces.light.muted}
          />
        </View>
      </View>
    </Pressable>
  );
}

export function MatchList({
  matches,
  preferences,
  onOpen,
}: {
  matches: Match[];
  preferences: StudentPreferences;
  onOpen: (clubId: string) => void;
}) {
  const reduced = useReducedMotion();
  const [limit, setLimit] = useState<number>(MATCHES_PER_PAGE);
  const shown = matches.slice(0, limit);
  const remaining = matches.length - shown.length;
  // Only claimed when the first club really matched more than the next one.
  const hasClosest =
    matches.length > 1 && matches[0].reasons.length > matches[1].reasons.length;
  const { hovered, hoverProps } = useHover();
  return (
    <View>
      {shown.map((match, index) => (
        <Animated.View
          key={match.club.id}
          entering={reduced ? undefined : FadeIn.duration(QUIZ_MOTION.enter)}
          layout={
            reduced ? undefined : LinearTransition.duration(QUIZ_MOTION.list)
          }
        >
          <MatchRow
            match={match}
            closest={index === 0 && hasClosest}
            preferences={preferences}
            onOpen={() => onOpen(match.club.id)}
          />
        </Animated.View>
      ))}
      {remaining > 0 ? (
        <Pressable
          onPress={() => setLimit((v) => v + MATCHES_PER_PAGE)}
          {...hoverProps}
          accessibilityRole="button"
          accessibilityLabel={`Show ${Math.min(remaining, MATCHES_PER_PAGE)} more matches`}
          className="min-h-11 justify-center"
        >
          <Text
            className={`underline ${hovered ? "text-python-blue dark:text-python-blue-light" : "text-light-text dark:text-dark-text"}`}
            style={[QUIZ_TYPE.button, webFade("color")]}
          >
            Show {Math.min(remaining, MATCHES_PER_PAGE)} more of {remaining}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
