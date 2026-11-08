import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { AgendaEntry } from "@/components/calendar/AgendaEntry";
import { CalendarEmpty, EmptyCopy } from "@/components/calendar/CalendarEmpty";
import {
  addDays,
  addMonths,
  dayOf,
  label,
  mondayOf,
  schoolWeekOf,
  todayKey,
} from "@/components/calendar/dates";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekView } from "@/components/calendar/WeekView";
import { ViewSwitch } from "@/components/clubs/ViewSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Check,
  Display,
  Glyph,
  Page,
  TextLink,
  useHover,
  webFade,
  webSticky,
} from "@/components/system";
import { Button, SkeletonRow } from "@/components/ui";
import { useCampusUpdates } from "@/context/CampusUpdatesContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useToast } from "@/context/ToastContext";
import { fetchUpcomingEvents } from "@/data/contentRepo";
import { dayLabel, downloadIcs, schoolDayKey } from "@/lib/calendar";
import { scheduleEventReminder } from "@/lib/push";
import { useLayout } from "@/theme/layout";
import type { ClubEvent } from "@/types/domain";

type Scope = "My clubs" | "All clubs";
const SCOPES = ["My clubs", "All clubs"] as const;
const VIEWS = ["Month", "Week", "Agenda"] as const;
type CalendarView = (typeof VIEWS)[number];

function StepButton({
  direction,
  label: name,
  onPress,
}: {
  direction: -1 | 1;
  label: string;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={name}
      className={`h-12 w-12 items-center justify-center rounded-sm ${hovered ? "bg-python-blue" : "bg-light-surface-2 dark:bg-dark-surface-2"}`}
      style={webFade("background-color")}
    >
      {hovered ? (
        <Text className="text-xl font-bold text-white">
          {direction < 0 ? "‹" : "›"}
        </Text>
      ) : (
        <Glyph
          name={direction < 0 ? "chevron-back" : "chevron-forward"}
          size={22}
          tone="text"
        />
      )}
    </Pressable>
  );
}

/** Period title with its navigation, shared by the Month and Week views. */
function PeriodHeader({
  title,
  aside,
  detail,
  size,
  onPrev,
  onNext,
  onToday,
  prevLabel,
  nextLabel,
}: {
  title: string;
  aside?: string;
  detail: string;
  size: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <View className="mb-4 flex-row items-end justify-between gap-4">
      <View className="shrink">
        <View className="flex-row items-baseline gap-2.5">
          <Display fontSize={size} accessibilityRole="header">
            {title}
          </Display>
          {aside ? (
            <Text className="text-xl font-bold text-light-muted dark:text-dark-muted">
              {aside}
            </Text>
          ) : null}
        </View>
        <Text className="text-base text-light-secondary dark:text-dark-secondary">
          {detail}
        </Text>
      </View>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Pressable
          onPress={onToday}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
          className="mr-1.5 h-12 justify-center rounded-sm px-3 hover:bg-light-surface-2 dark:hover:bg-dark-surface-2"
        >
          <Text className="text-base font-bold text-light-text dark:text-dark-text">
            Today
          </Text>
        </Pressable>
        <StepButton direction={-1} label={prevLabel} onPress={onPrev} />
        <StepButton direction={1} label={nextLabel} onPress={onNext} />
      </View>
    </View>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * One calendar for every club event the student can see, grouped by day.
 *
 * "Export" writes an .ics containing whatever is currently listed, so a
 * student can drop the whole term into Apple Calendar in one step, and each
 * entry still offers a single-event Google/ICS add.
 */
export default function CalendarScreen() {
  const { events: eventsVersion, reconnected } = useCampusUpdates();
  const { isDesktop, contentWidth, height } = useLayout();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { toast } = useToast();
  const { memberships } = useMemberships();
  const { clubs } = useClubs();
  const { prefsFor } = useNotifications();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>("My clubs");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deadlinesOnly, setDeadlinesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>("Month");
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [weekStart, setWeekStart] = useState(() => schoolWeekOf(todayKey()));
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchUpcomingEvents(150));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the calendar.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, eventsVersion, reconnected]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const scopedEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          (!deadlinesOnly || e.eventType === "Deadline") &&
          (scope === "All clubs" ||
            memberships.get(e.clubId)?.status === "active"),
      ),
    [events, scope, memberships, deadlinesOnly],
  );

  const visible = useMemo(
    () =>
      selectedDay
        ? scopedEvents.filter(
            (event) => schoolDayKey(event.startsAt) === selectedDay,
          )
        : scopedEvents,
    [scopedEvents, selectedDay],
  );

  // Group by calendar day so the list reads like a schedule, not a feed.
  const groupDays = (list: ClubEvent[]) => {
    const map = new Map<string, ClubEvent[]>();
    for (const event of list) {
      const key = schoolDayKey(event.startsAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const groups = useMemo(() => groupDays(visible), [visible]);
  const allGroups = useMemo(() => groupDays(scopedEvents), [scopedEvents]);

  const moveMonth = (by: 1 | -1) => {
    setDirection(by);
    setMonth((current) => addMonths(current, by));
    setSelectedDay(null);
  };
  const goToday = () => {
    const today = todayKey();
    setDirection(today.slice(0, 7) >= month ? 1 : -1);
    setMonth(today.slice(0, 7));
    setSelectedDay(today);
    setWeekStart(schoolWeekOf(today));
  };
  const openDay = useCallback((key: string) => {
    setMonth(key.slice(0, 7));
    setSelectedDay(key);
    setView("Month");
  }, []);

  const exportEvents = selectedDay && view === "Month" ? visible : scopedEvents;
  const exportAll = useCallback(async () => {
    if (exportEvents.length === 0) {
      toast("There are no events to export for these filters.", "info");
      return;
    }
    setExporting(true);
    try {
      await downloadIcs(
        exportEvents,
        scope === "My clubs" ? "My club events" : "Tesla STEM club events",
      );
      toast(`Exported ${plural(exportEvents.length, "event")}.`, "success");
    } finally {
      setExporting(false);
    }
  }, [exportEvents, scope, toast]);

  /** Sets a local reminder an hour before each listed event. */
  const remindAll = useCallback(async () => {
    const ids = await Promise.all(
      exportEvents
        .filter((e) => prefsFor(e.clubId).reminders)
        .slice(0, 30)
        .map((e) => scheduleEventReminder(e)),
    );
    const count = ids.filter(Boolean).length;
    toast(
      count > 0
        ? `Reminders set for ${plural(count, "event")}.`
        : "No reminders set; enable notifications in your profile first.",
      count > 0 ? "success" : "info",
    );
  }, [exportEvents, toast, prefsFor]);

  const browse = { label: "Browse clubs", onPress: () => router.push("/browse") };
  const showAllClubs = {
    label: "See every club's events",
    onPress: () => setScope("All clubs"),
  };
  const myClubs = useMemo(
    () => clubs.filter((c) => memberships.get(c.id)?.status === "active"),
    [clubs, memberships],
  );

  const emptyCopy = (): EmptyCopy => {
    const today = todayKey();
    if (selectedDay) {
      const name = label(selectedDay, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (selectedDay < today)
        return {
          title: "That day has passed",
          body: "This calendar shows what's coming up, so past events don't appear here.",
          primary: { label: "Go to today", onPress: goToday },
        };
      const next = scopedEvents.find(
        (e) => schoolDayKey(e.startsAt) > selectedDay,
      );
      const nextKey = next ? schoolDayKey(next.startsAt) : null;
      return {
        title: "A free day",
        body: next
          ? `${deadlinesOnly ? "No deadlines" : "Nothing"} on ${name}. Next up is ${next.title} on ${label(nextKey!, { weekday: "long", month: "long", day: "numeric" })}.`
          : `${deadlinesOnly ? "No deadlines" : "Nothing"} on ${name}, and nothing later either.`,
        primary: next
          ? { label: "Jump to it", onPress: () => openDay(nextKey!) }
          : undefined,
        secondary: { label: "Show all dates", onPress: () => setSelectedDay(null) },
      };
    }
    if (deadlinesOnly)
      return {
        title: "No deadlines coming up",
        body:
          scope === "My clubs"
            ? "None of your clubs has an application or registration deadline on the calendar."
            : "No club has a deadline on the calendar right now.",
        primary: {
          label: "Show all events",
          onPress: () => setDeadlinesOnly(false),
        },
      };
    if (scope === "All clubs")
      return {
        title: "Nothing scheduled yet",
        body: "No club has added a meeting, competition or deadline. Club leaders post them here as they're planned.",
        primary: browse,
      };
    const everyone = events.length;
    if (myClubs.length === 0)
      return {
        title: "Join a club to fill this in",
        body: everyone
          ? `Meetings and deadlines from clubs you join appear here. Other clubs have ${plural(everyone, "event")} coming up.`
          : "Meetings and deadlines from clubs you join appear here.",
        primary: browse,
        secondary: everyone ? showAllClubs : undefined,
      };
    return {
      title: "Nothing posted yet",
      body: `${myClubs.length === 1 ? "Your club hasn't" : "Your clubs haven't"} added any events. When a leader schedules one, it shows up here.`,
      primary: everyone ? showAllClubs : browse,
      regulars: myClubs,
    };
  };

  const twoColumn = contentWidth >= 960;
  const compactHead = contentWidth < 760;
  const monthEvents = useMemo(
    () => scopedEvents.filter((e) => schoolDayKey(e.startsAt).startsWith(month)),
    [scopedEvents, month],
  );
  const monthDeadlines = monthEvents.filter(
    (e) => e.eventType === "Deadline",
  ).length;
  const monthDays = new Set(monthEvents.map((e) => schoolDayKey(e.startsAt))).size;
  const monthDetail = loading
    ? " "
    : monthEvents.length === 0
      ? `Nothing ${deadlinesOnly ? "due" : "on the calendar"} this month`
      : `${plural(monthEvents.length, "event")} on ${plural(monthDays, "day")}${monthDeadlines && !deadlinesOnly ? `, ${plural(monthDeadlines, "deadline")}` : ""}`;

  const weekEnd = addDays(weekStart, 6);
  const weekTitle = `${label(weekStart, { month: "short" })} ${dayOf(weekStart)}–${weekEnd.slice(5, 7) !== weekStart.slice(5, 7) ? `${label(weekEnd, { month: "short" })} ` : ""}${dayOf(weekEnd)}`;
  const weekEvents = scopedEvents.filter((e) => {
    const key = schoolDayKey(e.startsAt);
    return key >= weekStart && key <= weekEnd;
  });

  const status = loading ? (
    <View className="pt-4">
      <SkeletonRow count={4} />
    </View>
  ) : error ? (
    <CalendarEmpty
      copy={{
        title: "The calendar didn't load",
        body: error,
        primary: { label: "Try again", onPress: () => void load() },
      }}
    />
  ) : null;

  const selectedPanelHead = selectedDay ? (
    <View className="flex-row items-end justify-between gap-4 border-b-2 border-python-blue pb-3">
      <View className="flex-row items-end gap-3">
        <Display fontSize={84} accessibilityRole="header">
          {dayOf(selectedDay)}
        </Display>
        <View className="pb-1.5">
          <Display fontSize={30}>
            {label(selectedDay, { weekday: "long" })}
          </Display>
          <Text className="text-base text-light-secondary dark:text-dark-secondary">
            {label(selectedDay, { month: "long" })}
            {visible.length ? `, ${plural(visible.length, "event")}` : ""}
          </Text>
        </View>
      </View>
      <TextLink label="Show all dates" onPress={() => setSelectedDay(null)} />
    </View>
  ) : (
    <View className="flex-row items-end justify-between gap-4 border-b-2 border-light-text pb-3 dark:border-dark-text">
      <Display size="lg" accessibilityRole="header">
        {deadlinesOnly ? "Deadlines" : "Coming up"}
      </Display>
      {scopedEvents.length ? (
        <Text className="pb-1 text-base text-light-secondary dark:text-dark-secondary">
          {plural(scopedEvents.length, deadlinesOnly ? "deadline" : "event")}
        </Text>
      ) : null}
    </View>
  );

  const panel = (
    <View>
      {selectedPanelHead}
      <Animated.View
        key={selectedDay ?? "all"}
        entering={reduced ? undefined : FadeIn.duration(160)}
      >
        {status ??
          (groups.length === 0 ? (
            <CalendarEmpty copy={emptyCopy()} />
          ) : selectedDay ? (
            groups[0][1].map((event) => (
              <AgendaEntry key={event.id} event={event} />
            ))
          ) : (
            groups.map(([day, list]) => (
              <View key={day} className="mt-6">
                <Pressable
                  onPress={() => openDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${dayLabel(list[0].startsAt)}`}
                  className="min-h-9 justify-center self-start hover:opacity-70"
                >
                  <Display size="sm" className="text-python-blue dark:text-python-blue-light">
                    {dayLabel(list[0].startsAt)}
                  </Display>
                </Pressable>
                <View className="border-t border-light-border dark:border-dark-border">
                  {list.map((event) => (
                    <AgendaEntry key={event.id} event={event} />
                  ))}
                </View>
              </View>
            ))
          ))}
      </Animated.View>
    </View>
  );

  const stickMonth = twoColumn && height >= 820;

  const main =
    view === "Month" ? (
      <View className={twoColumn ? "flex-row items-start gap-12" : ""}>
        <View
          style={[
            twoColumn ? { flex: 7, minWidth: 0 } : null,
            stickMonth ? webSticky(16) : null,
          ]}
        >
          <PeriodHeader
            title={label(`${month}-01`, { month: "long" })}
            aside={month.slice(0, 4)}
            detail={monthDetail}
            size={compactHead ? 58 : 78}
            onPrev={() => moveMonth(-1)}
            onNext={() => moveMonth(1)}
            onToday={goToday}
            prevLabel="Previous month"
            nextLabel="Next month"
          />
          <MonthGrid
            month={month}
            direction={direction}
            events={scopedEvents}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
        </View>
        <View
          className={twoColumn ? "" : "mt-9"}
          style={twoColumn ? { flex: 5, minWidth: 0, paddingTop: 34 } : undefined}
        >
          {panel}
        </View>
      </View>
    ) : view === "Week" ? (
      <View>
        <PeriodHeader
          title={weekTitle}
          detail={
            weekEvents.length
              ? `${plural(weekEvents.length, "event")} this week`
              : "Nothing scheduled this week"
          }
          size={compactHead ? 52 : 78}
          onPrev={() => setWeekStart((s) => addDays(s, -7))}
          onNext={() => setWeekStart((s) => addDays(s, 7))}
          onToday={() => setWeekStart(schoolWeekOf(todayKey()))}
          prevLabel="Previous week"
          nextLabel="Next week"
        />
        <View className="border-t-2 border-light-text pt-3 dark:border-dark-text">
          {status ?? <WeekView start={weekStart} events={weekEvents} onOpenDay={openDay} />}
        </View>
        {!status && weekEvents.length === 0 && scopedEvents.length > 0 ? (
          <View className="mt-5 items-start">
            <Button
              label={`Jump to ${scopedEvents[0].title}`}
              variant="secondary"
              onPress={() => setWeekStart(mondayOf(schoolDayKey(scopedEvents[0].startsAt)))}
            />
          </View>
        ) : null}
      </View>
    ) : (
      <View>
        {status ??
          (allGroups.length === 0 ? (
            <CalendarEmpty copy={emptyCopy()} />
          ) : (
            allGroups.map(([day, list]) => (
              <View
                key={day}
                className={`border-t-2 border-light-text py-5 dark:border-dark-text ${contentWidth >= 760 ? "flex-row gap-10" : ""}`}
              >
                <View style={contentWidth >= 760 ? { width: 200 } : undefined}>
                  <Display fontSize={72}>{dayOf(day)}</Display>
                  <Text className="text-lg font-bold text-light-text dark:text-dark-text">
                    {label(day, { weekday: "long" })}
                  </Text>
                  <Text className="text-base text-light-muted dark:text-dark-muted">
                    {label(day, { month: "long" })}
                  </Text>
                </View>
                <View className="flex-1" style={{ minWidth: 0, maxWidth: 820 }}>
                  {list.map((event) => (
                    <AgendaEntry key={event.id} event={event} />
                  ))}
                </View>
              </View>
            ))
          ))}
      </View>
    );

  return (
    <Page onRefresh={() => void onRefresh()} refreshing={refreshing} maxWidth={1720}>
      <View className="flex-row flex-wrap items-end justify-between gap-x-10 gap-y-3 border-b-2 border-light-text pb-4 dark:border-dark-text">
        <View className="flex-row items-start justify-between" style={!isDesktop ? { width: "100%" } : undefined}>
          <Display fontSize={compactHead ? 76 : 116} accessibilityRole="header">
            Calendar
          </Display>
          {!isDesktop ? <ThemeToggle /> : null}
        </View>
        <View
          className="flex-row flex-wrap items-center gap-x-5 gap-y-2.5"
          style={!isDesktop ? { width: "100%" } : undefined}
        >
          <ViewSwitch
            options={SCOPES}
            value={scope}
            onChange={setScope}
            width={94}
            label="Whose events"
          />
          <Check
            label="Deadlines only"
            checked={deadlinesOnly}
            onToggle={() => setDeadlinesOnly((value) => !value)}
          />
          <ViewSwitch
            options={VIEWS}
            value={view}
            onChange={setView}
            width={78}
            label="Calendar view"
          />
          <Pressable
            onPress={() => void exportAll()}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel={`Export ${plural(exportEvents.length, "event")} to my calendar as an .ics file`}
            accessibilityState={{ busy: exporting }}
            className="h-11 flex-row items-center gap-2 rounded-sm bg-python-blue px-4 hover:opacity-90"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : null}
            <Text className="text-base font-bold text-white">
              Export .ics
            </Text>
          </Pressable>
          {Platform.OS !== "web" ? (
            <Button
              label="Remind me"
              variant="secondary"
              icon="alarm-outline"
              onPress={() => void remindAll()}
            />
          ) : null}
        </View>
      </View>

      <Animated.View
        key={view}
        entering={reduced ? undefined : FadeIn.duration(170)}
        className="pt-5"
      >
        {main}
      </Animated.View>

      <Text className="mt-8 max-w-2xl text-sm text-light-muted dark:text-dark-muted">
        All times are Pacific.
        {Platform.OS === "web"
          ? " Reminders need the installed app. On the web, export to your own calendar and set them there."
          : ""}
      </Text>
    </Page>
  );
}
