import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import {
  Display,
  TextLink,
  nextSchoolDay,
  useHover,
  webFade,
} from "@/components/system";
import { useClubs } from "@/context/ClubsContext";
import { fetchUpcomingEvents } from "@/data/contentRepo";
import { formatEventDate } from "@/lib/calendar";
import { meetingDays } from "@/lib/discovery";
import { ink } from "@/theme/tokens";
import type { Club, ClubEvent } from "@/types/domain";

export type AuthPurpose = "alerts" | "profile" | "general";

/** Longer categories start short, so the panel never opens on a wall of names. */
const PREVIEW = { 1: 5, 2: 8 } as const;
const SHOW_ALL_UP_TO = 10;

/** Inside a category, "Rocketry" reads better than "Rocketry Club". */
function listName(name: string) {
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+Club$/i, "")
    .trim();
}

function useShowcase(purpose: AuthPurpose) {
  const { clubs } = useClubs();
  return useMemo(() => {
    const day = nextSchoolDay();
    const lit = new Set(
      purpose === "alerts"
        ? clubs.filter((c) => meetingDays(c.day).includes(day)).map((c) => c.id)
        : [],
    );
    const map = new Map<string, Club[]>();
    for (const club of clubs)
      map.set(club.category, [...(map.get(club.category) ?? []), club]);
    const groups = [...map.entries()]
      .map(([category, list]) => ({
        category,
        // Clubs meeting next lead, so a short preview still shows them.
        clubs: [...list].sort(
          (a, b) =>
            Number(lit.has(b.id)) - Number(lit.has(a.id)) ||
            a.name.localeCompare(b.name),
        ),
        lit: list.filter((c) => lit.has(c.id)).length,
      }))
      .sort((a, b) => b.clubs.length - a.clubs.length);
    const opening = [...groups].sort((a, b) => b.lit - a.lit)[0]?.category ?? null;
    const caption =
      clubs.length === 0
        ? ""
        : purpose === "alerts"
          ? `${lit.size} ${lit.size === 1 ? "club meets" : "clubs meet"} ${day}, shown in green.`
          : `${clubs.length} clubs at Tesla STEM.`;
    return { groups, lit, caption, opening };
  }, [clubs, purpose]);
}

function ClubLink({
  club,
  lit,
  width,
  onShow,
}: {
  club: Club;
  lit: boolean;
  width: `${number}%`;
  onShow: (club: Club | null) => void;
}) {
  const router = useRouter();
  const { hovered, hoverProps } = useHover();
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  return (
    <Pressable
      onPress={() => router.push(`/club/${club.id}`)}
      onHoverIn={() => {
        hoverProps.onHoverIn();
        onShow(club);
      }}
      onHoverOut={() => {
        hoverProps.onHoverOut();
        onShow(null);
      }}
      onFocus={() => {
        setFocused(true);
        onShow(club);
      }}
      onBlur={() => {
        setFocused(false);
        onShow(null);
      }}
      accessibilityRole="link"
      accessibilityLabel={`${club.name}, meets ${club.day}, ${club.time}`}
      className="justify-center pr-2"
      style={{ width, minHeight: 32 }}
    >
      <View
        style={[
          { transform: [{ translateX: active ? 5 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Display
          fontSize={21}
          numberOfLines={2}
          className={
            active
              ? "text-python-blue dark:text-python-blue-light"
              : lit
                ? "text-python-green dark:text-python-green-light"
                : "text-light-secondary dark:text-dark-secondary"
          }
          style={[{ lineHeight: 26 }, webFade("color")]}
        >
          {listName(club.name)}
        </Display>
      </View>
    </Pressable>
  );
}

/** One category's clubs, short by default, in columns that scan top to bottom. */
function ClubList({
  clubs,
  lit,
  columns,
  showMeta,
}: {
  clubs: Club[];
  lit: Set<string>;
  columns: 1 | 2;
  showMeta: boolean;
}) {
  const [all, setAll] = useState(false);
  const [shown, setShown] = useState<Club | null>(null);
  const long = clubs.length > SHOW_ALL_UP_TO;
  const visible = long && !all ? clubs.slice(0, PREVIEW[columns]) : clubs;
  return (
    <View>
      <View className="flex-row flex-wrap">
        {visible.map((club) => (
          <ClubLink
            key={club.id}
            club={club}
            lit={lit.has(club.id)}
            width={columns === 2 ? "50%" : "100%"}
            onShow={setShown}
          />
        ))}
      </View>
      {long ? (
        <TextLink
          label={all ? "Show fewer" : `Show all ${clubs.length}`}
          onPress={() => setAll((v) => !v)}
        />
      ) : null}
      {showMeta ? (
        <Text
          numberOfLines={1}
          className="mt-1 text-sm text-light-muted dark:text-dark-muted"
          style={{ minHeight: 20 }}
        >
          {shown
            ? [shown.day, shown.time, shown.location === "TBD" ? null : shown.location]
                .filter(Boolean)
                .join(", ")
            : ""}
        </Text>
      ) : null}
    </View>
  );
}

function CategoryRow({
  category,
  count,
  active,
  onPress,
}: {
  category: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="radio"
      aria-checked={active}
      accessibilityLabel={`${category}, ${count} clubs`}
      className="flex-row items-start"
      style={{ height: 38 }}
    >
      <View
        className="flex-row items-start"
        style={[
          { transform: [{ translateX: hovered && !active ? 5 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Display
          fontSize={28}
          className={
            active
              ? "text-python-blue dark:text-python-blue-light"
              : hovered
                ? "text-light-text dark:text-dark-text"
                : "text-light-muted dark:text-dark-muted"
          }
          style={webFade("color")}
        >
          {category}
        </Display>
        <Text className="ml-1 mt-0.5 text-xs text-light-muted dark:text-dark-muted">
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

/** The introduction: the promise, then a compact way into the clubs under it. */
export function AuthBrand({
  purpose,
  height,
  width,
}: {
  purpose: AuthPurpose;
  height: number;
  width: number;
}) {
  const { groups, lit, caption, opening } = useShowcase(purpose);
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? opening;
  const current = groups.find((g) => g.category === active);

  const pad = 52;
  const inner = width - pad * 2;
  const headline = Math.min(height * 0.13, inner / 5.05);
  const lineHeight = headline * 0.95;
  const indexWidth = 136;
  const listWidth = inner - indexWidth - 24;

  return (
    <View className="flex-1" style={{ padding: pad, paddingBottom: 36 }}>
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
      <Text className="mt-4 min-h-6 text-lg text-light-secondary dark:text-dark-secondary">
        {caption}
      </Text>

      <View
        className="flex-row border-t border-light-border pt-5 dark:border-dark-border"
        style={{ gap: 24, marginTop: Math.max(24, height * 0.05) }}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Club categories"
          style={{ width: indexWidth }}
        >
          {groups.map((group) => (
            <CategoryRow
              key={group.category}
              category={group.category}
              count={group.clubs.length}
              active={group.category === active}
              onPress={() => setPicked(group.category)}
            />
          ))}
        </View>
        {current ? (
          <Animated.View
            key={current.category}
            entering={reduced ? undefined : FadeIn.duration(180)}
            style={{ width: listWidth }}
          >
            <ClubList
              clubs={current.clubs}
              lit={lit}
              columns={listWidth >= 300 ? 2 : 1}
              showMeta
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function daySeed() {
  const now = new Date();
  return now.getFullYear() * 400 + now.getMonth() * 31 + now.getDate();
}

/** Longest word decides the size, so a name can fill the field without breaking. */
function spotlightSize(name: string, compact: boolean) {
  const n = name.length;
  const size = n <= 10 ? 104 : n <= 16 ? 88 : n <= 24 ? 70 : 56;
  return compact ? Math.round(size * 0.58) : size;
}

/**
 * The top of the blue field: one real club at a time from those meeting next,
 * or on Alerts the real events a member would hear about. Changes only when
 * asked to, so nothing moves while someone is typing a password.
 */
export function AuthSpotlight({
  purpose,
  compact,
}: {
  purpose: AuthPurpose;
  compact: boolean;
}) {
  const { clubs } = useClubs();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState(0);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const { hovered, hoverProps } = useHover();

  useEffect(() => {
    if (purpose !== "alerts") return;
    let alive = true;
    fetchUpcomingEvents(3)
      .then((next) => alive && setEvents(next))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [purpose]);

  const day = nextSchoolDay();
  const pool = useMemo(() => {
    const meeting = clubs.filter((c) => meetingDays(c.day).includes(day));
    return [...(meeting.length ? meeting : clubs)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [clubs, day]);

  if (purpose === "alerts" && events.length > 0)
    return (
      <View className="mt-4">
        <Text className="text-lg font-bold text-white">Coming up in clubs</Text>
        {events.slice(0, compact ? 1 : 3).map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/club/${event.clubId}`)}
            accessibilityRole="link"
            accessibilityLabel={`${event.title}, ${event.clubName ?? ""}. Open club.`}
            className="border-b border-white/40 py-2.5"
          >
            <Display fontSize={compact ? 30 : 38} className="text-white">
              {event.title}
            </Display>
            <Text className="mt-1 text-sm text-white">
              {[formatEventDate(event.startsAt), event.clubName]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </Pressable>
        ))}
      </View>
    );

  if (pool.length === 0) return null;
  const club = pool[(daySeed() + turn) % pool.length];
  const name = club.name.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const size = spotlightSize(name, compact);
  const location = club.location === "TBD" ? null : club.location;
  return (
    <View className={compact ? "mt-2" : "mt-5"}>
      <Text className="text-lg font-bold text-white">Meeting {day}</Text>
      <Animated.View
        key={club.id}
        entering={reduced ? undefined : FadeIn.duration(180)}
      >
        <Pressable
          onPress={() => router.push(`/club/${club.id}`)}
          {...hoverProps}
          accessibilityRole="link"
          accessibilityLabel={`${club.name}, meets ${club.day}, ${club.time}. Open club.`}
          className="self-start"
        >
          <Display
            fontSize={size}
            className={`text-white ${hovered ? "underline" : ""}`}
          >
            {name}
          </Display>
        </Pressable>
        <Text className="mt-3 text-base font-bold text-white">
          {[club.time, location].filter(Boolean).join(", ")}
        </Text>
        {!compact ? (
          <Text
            numberOfLines={2}
            className="mt-1 max-w-md text-base leading-6 text-white"
          >
            {club.description}
          </Text>
        ) : null}
      </Animated.View>
      <TextLink
        label="Show another club"
        onBlue
        onPress={() => setTurn((t) => t + 1)}
      />
    </View>
  );
}

/** Phones and tablets: the promise, one line of categories, and nothing open. */
export function AuthBrandCompact({
  purpose,
  width,
}: {
  purpose: AuthPurpose;
  width: number;
}) {
  const { groups, lit, caption } = useShowcase(purpose);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  const size = Math.min(width * 0.135, 64);
  const current = groups.find((g) => g.category === open);
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
      <Text className="mt-2 text-base text-light-secondary dark:text-dark-secondary">
        {caption}
      </Text>
      {groups.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 18 }}
        >
          {groups.map((group) => {
            const active = open === group.category;
            return (
              <Pressable
                key={group.category}
                onPress={() => setOpen(active ? null : group.category)}
                accessibilityRole="button"
                aria-expanded={active}
                accessibilityLabel={`${group.category}, ${group.clubs.length} clubs`}
                className="min-h-11 flex-row items-start"
                style={[
                  {
                    borderBottomWidth: 3,
                    borderBottomColor: active ? ink.blue : "transparent",
                  },
                  webFade("border-bottom-color"),
                ]}
              >
                <Display
                  fontSize={26}
                  className={
                    active
                      ? "text-python-blue dark:text-python-blue-light"
                      : "text-light-muted dark:text-dark-muted"
                  }
                >
                  {group.category}
                </Display>
                <Text className="ml-0.5 mt-0.5 text-xs text-light-muted dark:text-dark-muted">
                  {group.clubs.length}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {current ? (
        <Animated.View
          key={current.category}
          entering={reduced ? undefined : FadeIn.duration(160)}
          className="mt-3"
        >
          <ClubList
            clubs={current.clubs}
            lit={lit}
            columns={2}
            showMeta={false}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
