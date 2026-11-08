import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Python } from "@/components/python/Python";
import type { SaddleClub, TitleBox } from "@/components/python/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Display,
  Page,
  Rule,
  TextLink,
  nextSchoolDay,
  useHover,
  useRefresher,
} from "@/components/system";
import { Button, EmptyState, SkeletonRow } from "@/components/ui";
import {
  AnnouncementCard,
  EventCard,
  FileRow,
  RoleBadge,
} from "@/components/ClubContentCards";
import { useAuth } from "@/context/AuthContext";
import { useCampusUpdates } from "@/context/CampusUpdatesContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme } from "@/context/ThemeContext";
import { fetchUpcomingEvents } from "@/data/contentRepo";
import {
  EMPTY_DASHBOARD,
  fetchDashboard,
  type Dashboard,
} from "@/data/feedRepo";
import { meetingDays, meetingPeriods } from "@/lib/discovery";
import { useLayout } from "@/theme/layout";
import { easing } from "@/theme/motion";
import { ink, surface } from "@/theme/tokens";
import type { Club, ClubEvent } from "@/types/domain";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TITLE = ["TESLA", "STEM", "CLUBS"] as const;
const SLOTS = [
  { period: "Before School", phrase: "before school" },
  { period: "At Lunch", phrase: "at lunch" },
  { period: "After School", phrase: "after school" },
] as const;

/** Read synchronously so the title never flashes before its reveal. */
function prefersCalm() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function meetsAt(club: Club, day: string, period: string) {
  return (
    meetingDays(club.day).includes(day) &&
    meetingPeriods(club.time).includes(period)
  );
}

const FADE =
  Platform.OS === "web"
    ? ({
        transitionProperty: "color, border-bottom-color",
        transitionDuration: "140ms",
      } as object)
    : null;

function DayOption({
  day,
  active,
  compact,
  onPress,
}: {
  day: string;
  active: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  const page = surface(isDark);
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="radio"
      accessibilityLabel={day}
      aria-checked={active}
      className="min-h-12 min-w-11 items-center justify-center"
      style={[
        {
          borderBottomWidth: 4,
          borderBottomColor: active
            ? ink.blue
            : hovered
              ? `${ink.blue}66`
              : "transparent",
        },
        FADE,
      ]}
    >
      {/* Every state is bold, so choosing a day never nudges its neighbours. */}
      <Text
        style={[
          {
            fontSize: 20,
            lineHeight: 26,
            fontWeight: "700",
            color: active ? ink.blue : hovered ? page.text : page.secondary,
          },
          FADE,
        ]}
      >
        {compact ? day.slice(0, 3) : day}
      </Text>
    </Pressable>
  );
}

function DaySelector({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (day: string) => void;
  /** Three-letter days, so all five stay on one line in narrow columns. */
  compact: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Day of the week"
      className={`mb-1 flex-row flex-wrap ${compact ? "gap-x-6" : "gap-x-7"}`}
    >
      {WEEKDAYS.map((option) => (
        <DayOption
          key={option}
          day={option}
          active={option === value}
          compact={compact}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

/** Option row printed directly on the hero's coloured field. */
function FieldOptions({
  label,
  options,
  value,
  onChange,
  fg,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  fg: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-x-4"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            aria-checked={active}
            className="min-h-11 justify-center"
            style={{
              borderBottomWidth: 3,
              borderBottomColor: active ? ink.blue : "transparent",
            }}
          >
            <Text
              className="text-base"
              style={{
                color: fg,
                opacity: active ? 1 : 0.72,
                fontWeight: active ? "700" : "400",
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One line of the title, rising out from behind its own baseline. */
function TitleLine({
  text,
  size,
  delay,
  color,
  indent = 0,
}: {
  text: string;
  size: number;
  delay: number;
  color: string;
  indent?: number;
}) {
  const [calm] = useState(prefersCalm);
  const progress = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (!calm)
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 1100, easing: easing.emphasized }),
      );
  }, [calm, delay, progress]);
  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * size * 0.92 }],
  }));
  const height = size * 0.86;
  return (
    <View style={{ height, overflow: "hidden", marginLeft: indent }}>
      <Animated.View style={rise}>
        <Text
          className="font-display"
          style={{ color, fontSize: size, lineHeight: height }}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

function Hero({ scroll }: { scroll: { current: number } }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { clubs, loading, error, refresh } = useClubs();
  const { contentWidth, height, isDesktop, gutter } = useLayout();
  const [day, setDay] = useState(nextSchoolDay);
  const [phrase, setPhrase] = useState<string>("after school");
  const [hoverClub, setHoverClub] = useState<SaddleClub | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [titleY, setTitleY] = useState<number | null>(null);
  const slot = SLOTS.find((s) => s.phrase === phrase) ?? SLOTS[2];

  // The render loop stops once the hero has left the screen.
  useEffect(() => {
    const id = setInterval(() => setOnScreen(scroll.current < 1), 400);
    return () => clearInterval(id);
  }, [scroll]);

  const matches = useMemo(
    () => clubs.filter((club) => meetsAt(club, day, slot.period)),
    [clubs, day, slot.period],
  );
  const lit = useMemo(() => new Set(matches.map((c) => c.id)), [matches]);
  const poles = useMemo(
    () =>
      clubs
        .map((c) => ({ id: c.id, name: c.name, category: c.category }))
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.name.localeCompare(b.name),
        ),
    [clubs],
  );
  const hovered = clubs.find((c) => c.id === hoverClub?.id);

  const fg = surface(isDark).text;
  const side = contentWidth >= 760;
  const heroHeight = isDesktop ? Math.max(height, 640) : undefined;
  const titleSize = side
    ? Math.min((heroHeight ?? height) * 0.262, contentWidth * 0.19)
    : Math.min((contentWidth - gutter * 2) / 2.3, 230);
  const indent = titleSize * (side ? 0.46 : 0.18);
  const controlsWidth = side
    ? Math.min(contentWidth * 0.5, 560)
    : contentWidth - gutter * 2;
  const titleBox = useMemo<TitleBox | null>(
    () =>
      titleY === null
        ? null
        : {
            left: gutter,
            top: titleY,
            size: titleSize,
            indent,
            lineHeight: titleSize * 0.86,
            lines: TITLE,
            right: contentWidth - gutter,
          },
    [titleY, gutter, titleSize, indent, contentWidth],
  );
  const browseSlot = `/browse?day=${day}&period=${encodeURIComponent(slot.period)}`;
  const preview = matches.slice(0, 3).map((c) => c.name);
  const extra = matches.length - preview.length;

  return (
    <View
      style={{
        minHeight: heroHeight,
        paddingTop: insets.top + (isDesktop ? 36 : 20),
        paddingHorizontal: gutter,
        paddingBottom: isDesktop ? 36 : 28,
        overflow: "hidden",
      }}
      className="justify-between"
    >
      {!isDesktop ? (
        <View className="mb-5 flex-row justify-end" style={{ zIndex: 3 }}>
          <ThemeToggle />
        </View>
      ) : null}

      {/* Type sits under the canvas; the python's depth mask reveals it. */}
      <View
        accessibilityRole="header"
        aria-level={1}
        accessibilityLabel="Tesla STEM Clubs"
        style={{ zIndex: 1 }}
        onLayout={(e) => setTitleY(e.nativeEvent.layout.y)}
      >
        <TitleLine text={TITLE[0]} size={titleSize} delay={120} color={fg} />
        <TitleLine
          text={TITLE[1]}
          size={titleSize}
          delay={240}
          color={fg}
          indent={indent}
        />
        <TitleLine text={TITLE[2]} size={titleSize} delay={360} color={fg} />
      </View>

      <View
        className="absolute inset-0"
        style={{ zIndex: 2 }}
        pointerEvents="box-none"
      >
        {titleBox ? (
          <Python
            clubs={poles}
            lit={lit}
            placement={side ? "side" : "stacked"}
            title={titleBox}
            pulseKey={`${day}-${phrase}`}
            scroll={scroll}
            visible={onScreen}
            onHover={setHoverClub}
            onSelect={(club) => router.push(`/club/${club.id}`)}
          />
        ) : null}
      </View>

      {hovered ? (
        <View
          pointerEvents="none"
          className="absolute items-end"
          style={{ zIndex: 3, right: gutter, top: insets.top + 36 }}
        >
          <Text
            className="font-display"
            style={{ color: fg, fontSize: 40, lineHeight: 42, textAlign: "right" }}
          >
            {hovered.name}
          </Text>
          <Text className="text-base" style={{ color: fg }}>
            {hovered.day}, {hovered.time}
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          zIndex: 3,
          marginTop: side ? 20 : titleSize * 2.1,
          maxWidth: side ? controlsWidth : undefined,
        }}
      >
        <DaySelector
          value={day}
          onChange={setDay}
          compact={controlsWidth < 520}
        />
        <FieldOptions
          label="Time of day"
          options={SLOTS.map((s) => s.phrase)}
          value={phrase}
          onChange={setPhrase}
          fg={fg}
        />
        <View className="mt-3 min-h-[52px]" accessibilityLiveRegion="polite">
          {error ? (
            <View className="flex-row items-center gap-3">
              <Text className="text-base" style={{ color: fg }}>
                The club list didn't load.
              </Text>
              <TextLink label="Try again" onPress={refresh} />
            </View>
          ) : loading && clubs.length === 0 ? null : (
            <Text className="text-base" style={{ color: fg }}>
              <Text className="font-bold" style={{ color: fg }}>
                {matches.length === 0
                  ? `Nothing meets ${day} ${phrase}.`
                  : `${matches.length} ${matches.length === 1 ? "club meets" : "clubs meet"} ${day} ${phrase}: `}
              </Text>
              {preview.join(", ")}
              {extra > 0 ? `, and ${extra} more.` : matches.length ? "." : ""}
            </Text>
          )}
        </View>
        <View className="mt-3 flex-row flex-wrap items-center gap-x-6 gap-y-2">
          <Pressable
            onPress={() =>
              router.push(matches.length ? (browseSlot as never) : "/browse")
            }
            accessibilityRole="link"
            className="h-12 flex-row items-center rounded-md bg-python-blue px-6"
          >
            <Text
              className="font-display"
              style={{ color: "#FFFFFF", fontSize: 24, lineHeight: 26 }}
            >
              {matches.length ? `See ${day}'s clubs` : "Browse every club"}
            </Text>
          </Pressable>
          {matches.length ? (
            <Pressable
              onPress={() => router.push("/browse")}
              accessibilityRole="link"
              className="min-h-11 justify-center"
            >
              <Text className="text-base underline" style={{ color: fg }}>
                Browse all {clubs.length}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function InterestWord({
  label,
  count,
  scale,
  onPress,
}: {
  label: string;
  count: number;
  scale: number;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`${label}, ${count} clubs`}
      className="flex-row items-start"
    >
      <Display
        fontSize={scale}
        className={
          hovered
            ? "text-python-blue dark:text-python-blue-light"
            : "text-light-text dark:text-dark-text"
        }
      >
        {label}
      </Display>
      <Text className="ml-1 mt-1 text-sm font-bold text-light-muted dark:text-dark-muted">
        {count}
      </Text>
    </Pressable>
  );
}

/** Signed-out landing: the hero, then what's in the directory and what's next. */
function Landing() {
  const router = useRouter();
  const { clubs } = useClubs();
  const { gutter, contentWidth, isWide, height } = useLayout();
  const scroll = useRef(0 as number) as { current: number };
  const [events, setEvents] = useState<ClubEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchUpcomingEvents(5)
        .then((next) => alive && setEvents(next))
        .catch(() => alive && setEvents([]));
      return () => {
        alive = false;
      };
    }, []),
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const club of clubs)
      map.set(club.category, (map.get(club.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [clubs]);
  const most = categories[0]?.[1] ?? 1;
  const wordSize = (count: number) => {
    const top = Math.min(contentWidth * 0.14, 190);
    return Math.round(38 + (top - 38) * Math.sqrt(count / most) * 0.9);
  };

  return (
    <Page bleed onScrollY={(y) => (scroll.current = Math.min(1, y / Math.max(height * 0.9, 480)))}>
      <Hero scroll={scroll} />
      <View
        style={{ paddingHorizontal: gutter, maxWidth: 1560 }}
        className="w-full self-center pt-16"
      >
        <Text className="mb-5 max-w-md text-lg text-light-secondary dark:text-dark-secondary">
          Or start from what you already like.
        </Text>
        <View className="flex-row flex-wrap items-end gap-x-9 gap-y-1">
          {categories.map(([category, count]) => (
            <InterestWord
              key={category}
              label={category}
              count={count}
              scale={wordSize(count)}
              onPress={() =>
                router.push(`/browse?category=${category}` as never)
              }
            />
          ))}
        </View>

        <View
          className={`mt-20 ${isWide ? "flex-row items-start" : ""} gap-14`}
        >
          {events.length > 0 ? (
            <View className="flex-[3]">
              <Rule
                title="Coming up"
                trailing={
                  <TextLink
                    label="Open calendar"
                    onPress={() => router.push("/calendar")}
                  />
                }
              />
              {events.map((event) => (
                <EventCard key={event.id} event={event} showClub />
              ))}
            </View>
          ) : null}
          <View className={events.length > 0 ? "flex-[2]" : "max-w-xl"}>
            <Display size="md">Joining takes a school account.</Display>
            <Text className="mb-5 mt-3 text-base leading-6 text-light-secondary dark:text-dark-secondary">
              Browse as long as you like. Sign in with your @lwsd.org email to
              join clubs and get one calendar of just your meetings.
            </Text>
            <View className="self-start">
              <Button
                label="Sign in"
                size="lg"
                onPress={() => router.push("/account")}
              />
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}

/** Mon–Fri strip of the clubs the student actually belongs to. */
function MyWeek({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const today = nextSchoolDay();
  const { contentWidth } = useLayout();
  const stacked = contentWidth < 640;
  return (
    <View className={stacked ? "gap-4" : "flex-row"}>
      {WEEKDAYS.map((day) => {
        const items = clubs.filter((c) => meetingDays(c.day).includes(day));
        return (
          <View
            key={day}
            className={`flex-1 ${stacked ? "" : "border-l border-light-border pl-3 pr-2 dark:border-dark-border"}`}
          >
            <Display
              fontSize={24}
              className={
                day === today
                  ? "text-python-blue dark:text-python-blue-light"
                  : "text-light-muted dark:text-dark-muted"
              }
            >
              {day.slice(0, 3)}
            </Display>
            {items.length === 0 ? (
              <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
                Free
              </Text>
            ) : (
              items.map((club) => (
                <Pressable
                  key={club.id}
                  onPress={() => router.push(`/club/${club.id}`)}
                  accessibilityRole="link"
                  className="min-h-11 justify-center py-1"
                >
                  <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                    {club.name}
                  </Text>
                  <Text className="text-xs text-light-muted dark:text-dark-muted">
                    {club.time}, {club.location}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function DashboardScreen() {
  const {
    events: eventVersion,
    announcements: announcementVersion,
    reconnected,
  } = useCampusUpdates();
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { isDesktop, isWide } = useLayout();
  const { clubs } = useClubs();
  const { refresh: refreshMemberships } = useMemberships();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setDashboard(await fetchDashboard(8));
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load your dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, eventVersion, announcementVersion, reconnected]),
  );

  const { refreshing, onRefresh } = useRefresher(
    useCallback(
      () => Promise.all([load(), refreshMemberships(), refreshNotifications()]),
      [load, refreshMemberships, refreshNotifications],
    ),
  );

  const firstName = useMemo(() => {
    const name =
      profile?.display_name ?? profile?.email?.split("@")[0] ?? "there";
    return name.split(/[\s.]/)[0];
  }, [profile]);

  const myIds = useMemo(
    () => new Set(dashboard.clubs.map((c) => c.id)),
    [dashboard.clubs],
  );
  const myClubs = useMemo(
    () => clubs.filter((c) => myIds.has(c.id)),
    [clubs, myIds],
  );
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const nextEvent = dashboard.events[0];
  const laterEvents = dashboard.events.slice(1, 5);
  const announcements = dashboard.announcements.slice(0, 4);
  const nothingNew =
    dashboard.clubs.length > 0 &&
    dashboard.events.length === 0 &&
    dashboard.announcements.length === 0 &&
    dashboard.files.length === 0;

  return (
    <Page onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <View className="flex-row items-start justify-between gap-6">
        <View className="flex-1">
          <Display size="xl" accessibilityRole="header">
            Hi, {firstName}
          </Display>
          <Text className="mt-2 text-base text-light-muted dark:text-dark-muted">
            {today}
          </Text>
          {error ? (
            <View className="mt-3 items-start gap-2">
              <Text className="text-danger">{error}</Text>
              <Button label="Retry" onPress={() => void load()} />
            </View>
          ) : null}
        </View>
        {!isDesktop ? <ThemeToggle /> : null}
      </View>

      {unreadCount > 0 ? (
        <Pressable
          onPress={() => router.push("/notifications")}
          accessibilityRole="link"
          accessibilityLabel={`${unreadCount} unread notifications`}
          className="mt-6 flex-row items-center justify-between rounded-md bg-python-blue px-5 py-3"
        >
          <Display fontSize={26} className="text-white">
            {unreadCount} new {unreadCount === 1 ? "alert" : "alerts"}
          </Display>
          <Text className="text-sm font-bold text-white">Read them</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View className="pt-10">
          <SkeletonRow count={3} />
        </View>
      ) : dashboard.clubs.length === 0 ? (
        <View className="mt-10">
          <EmptyState
            title="You haven't joined a club yet"
            description="Join one and its meetings, Canvas links and files collect here."
            actionLabel="Browse clubs"
            onAction={() => router.push("/browse")}
          />
        </View>
      ) : (
        <View className={`mt-10 gap-14 ${isWide ? "flex-row items-start" : ""}`}>
          <View className="flex-[5]" style={{ minWidth: 0 }}>
            {nextEvent ? (
              <View className="mb-12">
                <Text className="text-base text-light-muted dark:text-dark-muted">
                  Next up, {nextEvent.clubName}
                </Text>
                <Display size="lg" className="mt-1 text-light-text dark:text-dark-text">
                  {nextEvent.title}
                </Display>
                <Text className="mt-2 text-lg text-light-secondary dark:text-dark-secondary">
                  {new Date(nextEvent.startsAt).toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    ...(nextEvent.dateOnly
                      ? {}
                      : { hour: "numeric", minute: "2-digit" }),
                    timeZone: "America/Los_Angeles",
                  })}
                  {nextEvent.location ? `, ${nextEvent.location}` : ""}
                </Text>
              </View>
            ) : null}

            <Rule title="Your week" />
            <View className="mt-4">
              <MyWeek clubs={myClubs} />
            </View>

            {laterEvents.length > 0 ? (
              <View className="mt-12">
                <Rule
                  title="After that"
                  trailing={
                    <TextLink
                      label="Open calendar"
                      onPress={() => router.push("/calendar")}
                    />
                  }
                />
                {laterEvents.map((event) => (
                  <EventCard key={event.id} event={event} showClub />
                ))}
              </View>
            ) : null}

            {nothingNew ? (
              <EmptyState
                title="All caught up"
                description="New Canvas links, files and events from your clubs appear here."
              />
            ) : null}
          </View>

          <View className="flex-[3]" style={{ minWidth: 0 }}>
            <Rule
              title="Your clubs"
              trailing={
                <TextLink
                  label="Find more"
                  onPress={() => router.push("/browse")}
                />
              }
            />
            {dashboard.clubs.map((club) => (
              <Pressable
                key={club.id}
                onPress={() => router.push(`/club/${club.id}`)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${club.name}`}
                className="flex-row items-center justify-between gap-3 border-b border-light-border py-3 dark:border-dark-border"
              >
                <Display fontSize={26} className="flex-1 text-light-text dark:text-dark-text">
                  {club.name}
                </Display>
                {club.status === "pending" ? (
                  <Text className="text-sm font-bold text-warn">Pending</Text>
                ) : (
                  <RoleBadge role={club.role} position={club.position} />
                )}
              </Pressable>
            ))}

            {announcements.length > 0 ? (
              <View className="mt-12">
                <Rule title="Canvas links" />
                {announcements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    showClub
                  />
                ))}
              </View>
            ) : null}

            {dashboard.files.length > 0 ? (
              <View className="mt-12 gap-2.5">
                <Rule title="New files" />
                {dashboard.files.slice(0, 4).map((file) => (
                  <FileRow key={file.id} file={file} showClub />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      )}
    </Page>
  );
}

export default function HomeScreen() {
  const { session, configured } = useAuth();
  return !configured || !session ? <Landing /> : <DashboardScreen />;
}
