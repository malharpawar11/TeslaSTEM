import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, nextSchoolDay } from "@/components/system";
import { useClubs } from "@/context/ClubsContext";
import { meetingDays } from "@/lib/discovery";
import { easing } from "@/theme/motion";
import { ink } from "@/theme/tokens";
import type { Club } from "@/types/domain";

export type AuthPurpose = "alerts" | "profile" | "general";

const COLUMNS = 3;
const WIRE = 2;

function prefersCalm() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function shortName(name: string) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

function useBrandData(purpose: AuthPurpose) {
  const { clubs } = useClubs();
  return useMemo(() => {
    const sorted = [...clubs].sort((a, b) => a.name.localeCompare(b.name));
    const day = nextSchoolDay();
    const lit = new Set(
      purpose === "alerts"
        ? clubs.filter((c) => meetingDays(c.day).includes(day)).map((c) => c.id)
        : [],
    );
    const caption =
      clubs.length === 0
        ? ""
        : purpose === "alerts"
          ? `${lit.size} ${lit.size === 1 ? "club meets" : "clubs meet"} ${day}. Sign in to hear from yours.`
          : `${clubs.length} clubs at Tesla STEM, one school sign-in.`;
    return { sorted, lit, caption };
  }, [clubs, purpose]);
}

function useDraw(delay: number, duration: number, calm: boolean) {
  const value = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (!calm)
      value.value = withDelay(
        delay,
        withTiming(1, { duration, easing: easing.emphasized }),
      );
  }, [calm, delay, duration, value]);
  return value;
}

function Branch({
  clubs,
  lit,
  rowHeight,
  delay,
  calm,
}: {
  clubs: Club[];
  lit: Set<string>;
  rowHeight: number;
  delay: number;
  calm: boolean;
}) {
  const drop = useDraw(delay, 420, calm);
  const names = useDraw(delay + 160, 360, calm);
  const dropStyle = useAnimatedStyle(() => ({
    height: `${drop.value * 100}%` as `${number}%`,
  }));
  const namesStyle = useAnimatedStyle(() => ({ opacity: names.value }));
  return (
    <View className="flex-1" style={{ minWidth: 0 }}>
      <Animated.View
        className="absolute left-0 top-0 bg-python-blue"
        style={[{ width: WIRE, marginBottom: rowHeight / 2 }, dropStyle]}
      />
      <Animated.View style={namesStyle}>
        {clubs.map((club) => {
          const on = lit.has(club.id);
          return (
            <View
              key={club.id}
              className="flex-row items-center"
              style={{ height: rowHeight }}
            >
              <View
                style={{
                  width: 11,
                  height: WIRE,
                  backgroundColor: on ? ink.laurel : ink.blue,
                }}
              />
              <Display
                fontSize={Math.round(rowHeight * 0.76)}
                numberOfLines={1}
                className={`ml-1.5 shrink ${on ? "text-python-green dark:text-python-green-light" : "text-light-secondary dark:text-dark-secondary"}`}
              >
                {shortName(club.name)}
              </Display>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/**
 * The slogan drawn as a circuit: one trunk rising from "One account." and
 * branching to every real club. On Alerts, the clubs meeting next are in green,
 * which is exactly what signing in would tell you about.
 */
export function AuthBrand({
  purpose,
  height,
  width,
}: {
  purpose: AuthPurpose;
  height: number;
  width: number;
}) {
  const { sorted, lit, caption } = useBrandData(purpose);
  const [calm] = useState(prefersCalm);
  const pad = 48;
  const headline = Math.min(height * 0.125, (width - pad * 2) * 0.2);
  const lineHeight = headline * 0.94;
  const headlineBlock = lineHeight * 3;
  const available = height - pad * 2 - headlineBlock - 92;
  const perColumn = Math.ceil(sorted.length / COLUMNS) || 1;
  const rowHeight = Math.max(17, Math.min(26, available / perColumn));
  const rows = Math.min(perColumn, Math.floor(available / rowHeight));
  const columns = Array.from({ length: COLUMNS }, (_, i) =>
    sorted.slice(i * perColumn, i * perColumn + rows),
  );

  const trunk = useDraw(80, 460, calm);
  const bus = useDraw(460, 360, calm);
  const trunkStyle = useAnimatedStyle(() => ({
    height: `${trunk.value * 100}%` as `${number}%`,
  }));
  const busStyle = useAnimatedStyle(() => ({
    width: `${bus.value * (100 * (COLUMNS - 1)) / COLUMNS}%` as `${number}%`,
  }));

  return (
    <View
      className="flex-1 justify-between border-r border-light-border dark:border-dark-border"
      style={{ padding: pad }}
    >
      <View className="flex-1" accessible={false} accessibilityElementsHidden>
        {/* Wires stop just short of the headline, at its node. */}
        <Animated.View
          className="absolute bottom-3 left-0 bg-python-blue"
          style={[{ width: WIRE }, trunkStyle]}
        />
        <View className="absolute bottom-3 left-0 h-2 w-2 -translate-x-[3px] translate-y-1 bg-laurel" />
        <Animated.View
          className="absolute left-0 top-0 bg-python-blue"
          style={[{ height: WIRE }, busStyle]}
        />
        <View className="flex-row pt-1">
          {columns.map((list, i) => (
            <Branch
              key={i}
              clubs={list}
              lit={lit}
              rowHeight={rowHeight}
              delay={720 + i * 110}
              calm={calm}
            />
          ))}
        </View>
      </View>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-light-text dark:text-dark-text"
          style={{ fontSize: headline, lineHeight }}
        >
          One account.{"\n"}
          <Text
            className="font-display"
            style={{ color: ink.blue, fontSize: headline, lineHeight }}
          >
            Every club{"\n"}you're in.
          </Text>
        </Text>
        <Text className="mt-5 min-h-6 text-lg text-light-secondary dark:text-dark-secondary">
          {caption}
        </Text>
      </View>
    </View>
  );
}

/** Phones and tablets: the slogan, plus the whole wiring reduced to one comb. */
export function AuthBrandCompact({
  purpose,
  width,
}: {
  purpose: AuthPurpose;
  width: number;
}) {
  const { sorted, lit, caption } = useBrandData(purpose);
  const size = Math.min(width * 0.135, 64);
  return (
    <View>
      <Text
        accessibilityRole="header"
        className="font-display text-light-text dark:text-dark-text"
        style={{ fontSize: size, lineHeight: size * 0.96 }}
      >
        One account.{"\n"}
        <Text className="font-display" style={{ color: ink.blue, fontSize: size }}>
          Every club you're in.
        </Text>
      </Text>
      {sorted.length ? (
        <View className="mt-3" accessible={false} accessibilityElementsHidden>
          <View style={{ height: WIRE, backgroundColor: ink.blue }} />
          <View className="flex-row justify-between">
            {sorted.map((club) => (
              <View
                key={club.id}
                style={{
                  width: WIRE,
                  height: lit.has(club.id) ? 14 : 8,
                  backgroundColor: lit.has(club.id) ? ink.laurel : ink.blue,
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Text className="mt-2 text-base text-light-secondary dark:text-dark-secondary">
        {caption}
      </Text>
    </View>
  );
}
