import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { relativeDate } from "@/components/ClubContentCards";
import {
  AlertKind,
  EventFacts,
  FeedEntry,
  buildFeed,
  eventFacts,
  kindOf,
} from "@/components/alerts/feed";
import { useReducedMotion } from "@/components/CampusVisual";
import { SignInGate } from "@/components/SignInGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Display,
  Page,
  TextLink,
  TextTabs,
  useHover,
  webFade,
  webSticky,
} from "@/components/system";
import { Button, EmptyState, SkeletonRow } from "@/components/ui";
import { useClubs } from "@/context/ClubsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useLayout } from "@/theme/layout";
import type { AppNotification, NotificationType } from "@/types/domain";

/**
 * The activity centre. Rows are read-only records written by database triggers;
 * the one action a student has is marking them read, plus opening whatever an
 * alert is about. Each kind of alert has its own weight in the feed.
 */

type Filter = "All" | "Unread" | "Requests";
const FILTERS = ["All", "Unread", "Requests"] as const;
type KindFilter = "Everything" | "Meetings" | "Files and notes" | "Decisions";
const KIND_FILTERS = [
  "Everything",
  "Meetings",
  "Files and notes",
  "Decisions",
] as const;
const KIND_FOR: Record<Exclude<KindFilter, "Everything">, AlertKind> = {
  Meetings: "meeting",
  "Files and notes": "resource",
  Decisions: "decision",
};
const SORTS = ["Newest", "Oldest"] as const;
type Sort = (typeof SORTS)[number];

const VERB: Partial<Record<NotificationType, string>> = {
  event_created: "New",
  event_updated: "Changed",
  event_cancelled: "Cancelled",
  event_reminder: "Reminder",
  file_uploaded: "File",
  note_posted: "Notes",
  join_request: "Join request",
  board_request: "Board request",
  membership_approved: "You're in",
  board_approved: "You're on the board",
  board_rejected: "Board request declined",
  club_approved: "Club approved",
  club_rejected: "Club declined",
};

const LEAVE_MS = 260;
const LIVE_LAYOUT_LIMIT = 40;

/** Marks one entry read without opening it. */
function ReadToggle({
  label,
  inverted,
  onPress,
}: {
  label: string;
  inverted?: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center"
    >
      <View
        className={
          hovered
            ? `h-4 w-4 rounded-sm border-2 ${inverted ? "border-white" : "border-python-blue"}`
            : `h-2.5 w-2.5 rounded-sm ${inverted ? "bg-white" : "bg-python-blue"}`
        }
      />
    </Pressable>
  );
}

function DateMark({ facts, unread }: { facts: EventFacts; unread: boolean }) {
  return (
    <View style={{ width: 62 }}>
      <Text className="text-sm font-bold text-light-muted dark:text-dark-muted">
        {facts.month}
      </Text>
      <Display
        fontSize={50}
        className={
          unread ? "text-python-blue" : "text-light-muted dark:text-dark-muted"
        }
      >
        {facts.day}
      </Display>
    </View>
  );
}

function Occurrence({
  n,
  onOpen,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const { hovered, hoverProps } = useHover();
  const facts = eventFacts(n.body);
  const unread = !n.readAt;
  return (
    <Pressable
      onPress={() => onOpen(n)}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread: " : ""}Open ${n.title}, ${n.body ?? ""}`}
      className="min-h-9 justify-center pr-5"
    >
      <Text
        className={`text-sm font-bold ${hovered ? "text-python-blue dark:text-python-blue-light" : unread ? "text-light-text dark:text-dark-text" : "text-light-muted dark:text-dark-muted"}`}
        style={webFade("color")}
      >
        {facts ? `${facts.month} ${facts.day}` : relativeDate(n.createdAt)}
      </Text>
    </Pressable>
  );
}

const Entry = memo(function Entry({
  entry,
  clubName,
  leaving,
  live,
  onOpen,
  onMark,
}: {
  entry: FeedEntry;
  clubName?: string;
  leaving: boolean;
  live: boolean;
  onOpen: (n: AppNotification) => void;
  onMark: (ids: number[]) => void;
}) {
  const reduced = useReducedMotion();
  const { hovered, hoverProps } = useHover();
  const [expanded, setExpanded] = useState(false);
  const first = entry.items[0];
  const count = entry.items.length;
  const unreadItems = entry.items.filter((n) => !n.readAt);
  const unread = unreadItems.length > 0;
  const facts = eventFacts(first.body);
  const cancelled = first.type === "event_cancelled";
  const bad = first.type.endsWith("rejected");
  const verb = VERB[first.type];
  const markLabel =
    count > 1 ? `Mark all ${count} dates read` : `Mark read: ${entry.title}`;

  const fade = useSharedValue(1);
  useEffect(() => {
    fade.value = reduced
      ? leaving
        ? 0
        : 1
      : withTiming(leaving ? 0 : 1, { duration: LEAVE_MS });
  }, [leaving, reduced, fade]);
  const exit = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: (1 - fade.value) * 28 }],
  }));

  const open = () => onOpen(first);
  const a11y = `${unread ? "Unread: " : ""}${verb ? `${verb}, ` : ""}${entry.title}${clubName ? `, ${clubName}` : ""}`;
  const titleTone = unread
    ? "text-light-text dark:text-dark-text"
    : "text-light-muted dark:text-dark-muted";

  let content;
  if (entry.kind === "request") {
    // Someone is waiting on this student: the only solid colour in the feed.
    content = (
      <View
        className="mb-2 flex-row items-center justify-between gap-4 rounded-sm bg-python-blue pr-3"
        style={[{ opacity: hovered ? 0.92 : 1 }, webFade("opacity")]}
        {...({ dataSet: { onblue: "true" } } as object)}
      >
        <Pressable
          onPress={open}
          {...hoverProps}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          className="flex-1 py-4 pl-5"
        >
          <Text className="text-sm font-bold text-white">
            {[verb, clubName].filter(Boolean).join(", ")}
          </Text>
          <Display fontSize={38} className="text-white">
            {entry.title}
          </Display>
          {first.body ? (
            <Text className="text-base text-white" numberOfLines={2}>
              {first.body}
            </Text>
          ) : null}
        </Pressable>
        {unread ? (
          <ReadToggle
            inverted
            label={markLabel}
            onPress={() => onMark([first.id])}
          />
        ) : null}
      </View>
    );
  } else if (entry.kind === "meeting") {
    const shown = expanded ? entry.items : entry.items.slice(0, 6);
    content = (
      <View className="flex-row gap-4 border-b border-light-border py-4 dark:border-dark-border">
        <View className="flex-1" style={{ minWidth: 0 }}>
          <Pressable
            onPress={open}
            {...hoverProps}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            className="flex-row gap-4"
          >
            {facts ? <DateMark facts={facts} unread={unread} /> : null}
            <View className="flex-1" style={{ minWidth: 0 }}>
              <View className="flex-row flex-wrap items-baseline gap-x-2.5">
                <Text
                  className={`text-sm font-bold ${cancelled ? "text-danger" : "text-light-muted dark:text-dark-muted"}`}
                >
                  {verb}
                </Text>
                {clubName ? (
                  <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
                    {clubName}
                  </Text>
                ) : null}
                {count > 1 ? (
                  <Text className="text-sm text-light-muted dark:text-dark-muted">
                    {count} dates
                  </Text>
                ) : null}
              </View>
              <Display
                fontSize={36}
                className={`${hovered ? "text-python-blue" : titleTone} ${cancelled ? "line-through" : ""}`}
                style={webFade("color")}
              >
                {entry.title}
              </Display>
              {facts?.time || facts?.place ? (
                <Text className="mt-0.5 text-base text-light-secondary dark:text-dark-secondary">
                  {[facts.time, facts.place].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {!facts && first.body ? (
                <Text className="mt-0.5 text-base text-light-secondary dark:text-dark-secondary">
                  {first.body}
                </Text>
              ) : null}
            </View>
          </Pressable>
          {count > 1 ? (
            <View
              className="flex-row flex-wrap items-center"
              style={{ marginLeft: facts ? 78 : 0 }}
            >
              {shown.map((n) => (
                <Occurrence key={n.id} n={n} onOpen={onOpen} />
              ))}
              {count > 6 ? (
                <TextLink
                  label={expanded ? "Show fewer" : `${count - 6} more`}
                  onPress={() => setExpanded((v) => !v)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        {unread ? (
          <ReadToggle
            label={markLabel}
            onPress={() => onMark(unreadItems.map((n) => n.id))}
          />
        ) : (
          <View className="w-11" />
        )}
      </View>
    );
  } else if (entry.kind === "decision") {
    content = (
      <View className="flex-row items-start justify-between gap-4 border-b border-light-border py-4 dark:border-dark-border">
        <Pressable
          onPress={open}
          {...hoverProps}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          className="flex-1"
        >
          <Text
            className={`text-sm font-bold ${bad ? "text-danger" : "text-python-green dark:text-python-green-light"}`}
          >
            {verb}
          </Text>
          <Display
            fontSize={30}
            className={hovered ? "text-python-blue" : titleTone}
            style={webFade("color")}
          >
            {clubName ?? entry.title}
          </Display>
          <Text
            className="text-base text-light-secondary dark:text-dark-secondary"
            numberOfLines={2}
          >
            {clubName ? (first.body ?? entry.title) : first.body}
          </Text>
        </Pressable>
        {unread ? (
          <ReadToggle label={markLabel} onPress={() => onMark([first.id])} />
        ) : (
          <View className="w-11" />
        )}
      </View>
    );
  } else {
    // Files and notes are housekeeping, so they stay on one quiet line.
    content = (
      <View className="min-h-12 flex-row items-center border-b border-light-hairline dark:border-dark-hairline">
        <Pressable
          onPress={open}
          {...hoverProps}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          className="min-h-12 flex-1 flex-row items-center gap-3"
        >
          <Text
            style={{ width: 62 }}
            className="text-sm font-bold text-light-muted dark:text-dark-muted"
          >
            {verb}
          </Text>
          <Text
            numberOfLines={1}
            className={`shrink text-base ${unread ? "font-bold" : ""} ${hovered ? "text-python-blue dark:text-python-blue-light" : titleTone}`}
          >
            {first.body ?? entry.title}
          </Text>
          {clubName ? (
            <Text
              numberOfLines={1}
              className="flex-1 text-sm text-light-muted dark:text-dark-muted"
            >
              {clubName}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
        </Pressable>
        {unread ? (
          <ReadToggle label={markLabel} onPress={() => onMark([first.id])} />
        ) : (
          <View className="w-11" />
        )}
      </View>
    );
  }

  return (
    <Animated.View
      layout={live && !reduced ? LinearTransition.duration(220) : undefined}
      style={exit}
    >
      {content}
    </Animated.View>
  );
});

function NotificationsInbox() {
  const router = useRouter();
  const { isDesktop, contentWidth } = useLayout();
  const reduced = useReducedMotion();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    refresh,
    hasMore,
    loadMore,
  } = useNotifications();
  const { clubs } = useClubs();
  const [filter, setFilter] = useState<Filter>("All");
  const [kindFilter, setKindFilter] = useState<KindFilter>("Everything");
  const [sort, setSort] = useState<Sort>("Newest");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const clubNames = useMemo(
    () => new Map(clubs.map((c) => [c.id, c.name])),
    [clubs],
  );
  const nameOf = useCallback(
    (n: AppNotification) => (n.clubId ? clubNames.get(n.clubId) : "Tesla STEM"),
    [clubNames],
  );

  const requests = useMemo(
    () => notifications.filter((n) => kindOf(n) === "request"),
    [notifications],
  );

  const visible = useMemo(() => {
    let list = notifications;
    if (filter === "Unread")
      list = list.filter((n) => !n.readAt || leaving.has(n.id));
    if (filter === "Requests") list = requests;
    else if (kindFilter !== "Everything")
      list = list.filter((n) => kindOf(n) === KIND_FOR[kindFilter]);
    return list;
  }, [notifications, filter, requests, kindFilter, leaving]);

  const feed = useMemo(
    () => buildFeed(visible, nameOf, sort === "Oldest"),
    [visible, nameOf, sort],
  );
  const entryCount = feed.reduce((sum, day) => sum + day.entries.length, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // In Unread, a read alert fades out first so the list doesn't jump.
  const mark = useCallback(
    (ids?: number[]) => {
      const targets =
        ids ?? notifications.filter((n) => !n.readAt).map((n) => n.id);
      if (filter === "Unread" && targets.length) {
        setLeaving((prev) => new Set([...prev, ...targets]));
        timers.current.push(
          setTimeout(() => {
            setLeaving((prev) => {
              const next = new Set(prev);
              targets.forEach((id) => next.delete(id));
              return next;
            });
          }, LEAVE_MS),
        );
      }
      void markRead(ids);
    },
    [filter, markRead, notifications],
  );

  const openNotification = useCallback(
    (n: AppNotification) => {
      if (!n.readAt) void markRead([n.id]);
      if (!n.clubId) return;
      // Requests are handled in the club's management area; everything else
      // belongs on the club page itself.
      if (kindOf(n) === "request") router.push(`/club/${n.clubId}/manage`);
      else router.push(`/club/${n.clubId}`);
    },
    [markRead, router],
  );

  const showMore = async () => {
    setLoadingMore(true);
    await loadMore();
    setLoadingMore(false);
  };

  const wide = contentWidth >= 820;
  const live = entryCount <= LIVE_LAYOUT_LIMIT;

  const counts: Partial<Record<Filter, number>> = {
    Unread: unreadCount,
    Requests: requests.length,
    ...(hasMore ? {} : { All: notifications.length }),
  };

  const emptyTitle =
    filter === "Requests"
      ? "No one's waiting on you"
      : filter === "Unread"
        ? "You've read everything"
        : kindFilter !== "Everything"
          ? "Nothing of this kind yet"
          : "Nothing yet";

  return (
    <Page
      onRefresh={() => void onRefresh()}
      refreshing={refreshing}
      maxWidth={1400}
    >
      <View className="flex-row items-end justify-between gap-6">
        <View className="flex-row items-end gap-5">
          <Display
            fontSize={contentWidth < 640 ? 76 : 116}
            accessibilityRole="header"
          >
            Alerts
          </Display>
          <View
            className="pb-2"
            accessible
            accessibilityLabel={
              error ? "Updates unavailable" : `${unreadCount} unread alerts`
            }
          >
            <Animated.View
              key={unreadCount}
              entering={reduced ? undefined : FadeInDown.duration(200)}
            >
              <Display
                fontSize={contentWidth < 640 ? 34 : 46}
                className={
                  unreadCount
                    ? "text-python-blue"
                    : "text-light-muted dark:text-dark-muted"
                }
              >
                {error ? "–" : unreadCount}
              </Display>
            </Animated.View>
            <Text className="text-sm font-bold text-light-secondary dark:text-dark-secondary">
              unread
            </Text>
          </View>
        </View>
        {!isDesktop ? <ThemeToggle /> : null}
      </View>

      <View
        className="mt-3 border-b-2 border-light-text bg-light-bg pb-1 pt-1 dark:border-dark-text dark:bg-dark-bg"
        style={[{ zIndex: 10 }, wide ? webSticky(0) : null]}
      >
        <View className="flex-row flex-wrap items-center justify-between gap-x-8">
          <TextTabs
            label="Show alerts"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            counts={counts}
          />
          <View className="flex-row flex-wrap items-center gap-x-6">
            <TextTabs
              label="Sort alerts"
              options={SORTS}
              value={sort}
              onChange={setSort}
            />
            {unreadCount > 0 ? (
              <TextLink label="Mark all read" onPress={() => mark()} />
            ) : null}
          </View>
        </View>
        {filter !== "Requests" ? (
          <TextTabs
            label="Kind of alert"
            options={KIND_FILTERS}
            value={kindFilter}
            onChange={setKindFilter}
          />
        ) : null}
      </View>

      <Animated.View
        key={`${filter}-${kindFilter}`}
        entering={reduced ? undefined : FadeIn.duration(170)}
      >
        {error ? (
          <View className="items-start gap-3 pt-6">
            <Text className="text-danger">{error}</Text>
            <Button label="Retry" onPress={() => void refresh()} />
          </View>
        ) : loading && notifications.length === 0 ? (
          <View className="pt-6">
            <SkeletonRow count={4} />
          </View>
        ) : entryCount === 0 ? (
          <EmptyState
            title={emptyTitle}
            description="Event changes, new files and membership decisions from your clubs show up here."
          />
        ) : (
          feed.map((day) => (
            <View
              key={day.key}
              className={`mt-7 ${wide ? "flex-row items-start gap-10" : ""}`}
            >
              <View
                style={[
                  wide ? { width: 150 } : { marginBottom: 4 },
                  wide ? webSticky(112) : null,
                ]}
              >
                <Display
                  fontSize={wide ? 40 : 34}
                  accessibilityRole="header"
                  className="text-light-text dark:text-dark-text"
                >
                  {day.label}
                </Display>
              </View>
              <View className="flex-1" style={{ minWidth: 0 }}>
                {day.entries.map((entry) => (
                  <Entry
                    key={entry.key}
                    entry={entry}
                    clubName={nameOf(entry.items[0])}
                    leaving={
                      filter === "Unread" &&
                      entry.items.every((n) => leaving.has(n.id))
                    }
                    live={live}
                    onOpen={openNotification}
                    onMark={mark}
                  />
                ))}
              </View>
            </View>
          ))
        )}
        {hasMore && filter !== "Requests" && !error ? (
          <View className="mt-8 items-start">
            <Button
              label="Load older alerts"
              variant="secondary"
              size="lg"
              loading={loadingMore}
              onPress={() => void showMore()}
            />
          </View>
        ) : null}
      </Animated.View>
    </Page>
  );
}

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in for alerts"
        subtitle="Event changes, new files and decisions from your clubs, tied to your @lwsd.org account."
        purpose="alerts"
      >
        <NotificationsInbox />
      </SignInGate>
    </View>
  );
}
